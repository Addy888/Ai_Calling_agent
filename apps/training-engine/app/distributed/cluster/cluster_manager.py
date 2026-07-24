"""Cluster manager for multi-node coordination."""

import os
import socket
from typing import Dict, List, Optional, Set
from datetime import datetime

try:
    import torch.distributed as dist
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    dist = None

from app.logger import training_logger
from app.distributed.schemas import WorkerInfo, WorkerStatus
from app.distributed.exceptions import ProcessGroupException


class ClusterManager:
    """
    Manages multi-node cluster operations.
    
    Coordinates distributed training across multiple machines,
    handles node discovery, health monitoring, and failure recovery.
    """

    def __init__(self):
        """Initialize cluster manager."""
        self.logger = training_logger
        self._nodes: Dict[int, Dict] = {}  # machine_rank -> node_info
        self._active_nodes: Set[int] = set()
        self._failed_nodes: Set[int] = set()
        self._is_initialized = False

    def initialize_cluster(
        self,
        num_nodes: int,
        node_rank: int,
        master_addr: str,
        master_port: int,
    ) -> None:
        """
        Initialize cluster configuration.
        
        Args:
            num_nodes: Total number of nodes
            node_rank: Current node rank
            master_addr: Master node address
            master_port: Master node port
        """
        self.logger.info(
            f"Initializing cluster: "
            f"nodes={num_nodes}, rank={node_rank}, "
            f"master={master_addr}:{master_port}"
        )
        
        try:
            # Register current node
            node_info = {
                "rank": node_rank,
                "hostname": socket.gethostname(),
                "ip": socket.gethostbyname(socket.gethostname()),
                "master_addr": master_addr,
                "master_port": master_port,
                "num_nodes": num_nodes,
                "status": "active",
                "registered_at": datetime.utcnow(),
            }
            
            self._nodes[node_rank] = node_info
            self._active_nodes.add(node_rank)
            self._is_initialized = True
            
            self.logger.info(f"Cluster initialized on node {node_rank}")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize cluster: {e}")
            raise ProcessGroupException(f"Cluster initialization failed: {e}")

    def register_node(self, node_rank: int, node_info: Dict) -> None:
        """
        Register a node in the cluster.
        
        Args:
            node_rank: Node rank
            node_info: Node information
        """
        self._nodes[node_rank] = node_info
        self._active_nodes.add(node_rank)
        self.logger.info(f"Node {node_rank} registered: {node_info.get('hostname')}")

    def mark_node_failed(self, node_rank: int) -> None:
        """
        Mark a node as failed.
        
        Args:
            node_rank: Node rank
        """
        if node_rank in self._active_nodes:
            self._active_nodes.remove(node_rank)
        self._failed_nodes.add(node_rank)
        
        if node_rank in self._nodes:
            self._nodes[node_rank]["status"] = "failed"
        
        self.logger.warning(f"Node {node_rank} marked as failed")

    def mark_node_recovered(self, node_rank: int) -> None:
        """
        Mark a failed node as recovered.
        
        Args:
            node_rank: Node rank
        """
        if node_rank in self._failed_nodes:
            self._failed_nodes.remove(node_rank)
        self._active_nodes.add(node_rank)
        
        if node_rank in self._nodes:
            self._nodes[node_rank]["status"] = "active"
        
        self.logger.info(f"Node {node_rank} recovered")

    def get_active_nodes(self) -> List[int]:
        """
        Get list of active node ranks.
        
        Returns:
            List of active node ranks
        """
        return list(self._active_nodes)

    def get_failed_nodes(self) -> List[int]:
        """
        Get list of failed node ranks.
        
        Returns:
            List of failed node ranks
        """
        return list(self._failed_nodes)

    def get_node_info(self, node_rank: int) -> Optional[Dict]:
        """
        Get information about a specific node.
        
        Args:
            node_rank: Node rank
            
        Returns:
            Node information dictionary
        """
        return self._nodes.get(node_rank)

    def get_all_nodes(self) -> Dict[int, Dict]:
        """
        Get information about all nodes.
        
        Returns:
            Dictionary mapping node ranks to node information
        """
        return self._nodes.copy()

    def is_node_active(self, node_rank: int) -> bool:
        """
        Check if a node is active.
        
        Args:
            node_rank: Node rank
            
        Returns:
            True if node is active
        """
        return node_rank in self._active_nodes

    def get_cluster_health(self) -> Dict:
        """
        Get cluster health status.
        
        Returns:
            Dictionary with cluster health information
        """
        total_nodes = len(self._nodes)
        active_nodes = len(self._active_nodes)
        failed_nodes = len(self._failed_nodes)
        
        health_percentage = (active_nodes / total_nodes * 100) if total_nodes > 0 else 0
        
        return {
            "total_nodes": total_nodes,
            "active_nodes": active_nodes,
            "failed_nodes": failed_nodes,
            "health_percentage": health_percentage,
            "is_healthy": failed_nodes == 0,
            "active_node_ranks": list(self._active_nodes),
            "failed_node_ranks": list(self._failed_nodes),
        }

    def barrier_with_timeout(self, timeout_seconds: int = 300) -> bool:
        """
        Cluster-wide barrier with timeout.
        
        Args:
            timeout_seconds: Timeout in seconds
            
        Returns:
            True if barrier succeeded
        """
        if not TORCH_AVAILABLE or not dist.is_initialized():
            return True
        
        try:
            import datetime
            timeout = datetime.timedelta(seconds=timeout_seconds)
            dist.barrier(timeout=timeout)
            return True
        except Exception as e:
            self.logger.error(f"Cluster barrier failed: {e}")
            return False

    def broadcast_to_cluster(self, data: str, src_rank: int = 0) -> Optional[str]:
        """
        Broadcast data across the cluster.
        
        Args:
            data: Data to broadcast
            src_rank: Source rank
            
        Returns:
            Broadcasted data
        """
        if not TORCH_AVAILABLE or not dist.is_initialized():
            return data
        
        try:
            import torch
            
            # Convert to tensor
            if dist.get_rank() == src_rank:
                data_bytes = data.encode('utf-8')
                length = len(data_bytes)
            else:
                length = 0
            
            # Broadcast length
            length_tensor = torch.tensor([length], dtype=torch.long)
            dist.broadcast(length_tensor, src=src_rank)
            length = length_tensor.item()
            
            # Broadcast data
            if dist.get_rank() == src_rank:
                data_tensor = torch.tensor(list(data_bytes), dtype=torch.uint8)
            else:
                data_tensor = torch.zeros(length, dtype=torch.uint8)
            
            dist.broadcast(data_tensor, src=src_rank)
            
            # Convert back
            result_bytes = bytes(data_tensor.tolist())
            return result_bytes.decode('utf-8')
            
        except Exception as e:
            self.logger.error(f"Cluster broadcast failed: {e}")
            return None

    def cleanup(self) -> None:
        """Cleanup cluster resources."""
        self.logger.info("Cleaning up cluster resources")
        self._nodes.clear()
        self._active_nodes.clear()
        self._failed_nodes.clear()
        self._is_initialized = False


# Global instance
cluster_manager = ClusterManager()
