"""Network utilities for distributed training."""

import socket
import random
from typing import Optional, Tuple

from app.logger import training_logger


class NetworkUtils:
    """
    Network utilities for distributed training.
    
    Provides network-related helper functions for cluster setup.
    """

    def __init__(self):
        """Initialize network utilities."""
        self.logger = training_logger

    def get_local_ip(self) -> str:
        """
        Get local IP address.
        
        Returns:
            Local IP address string
        """
        try:
            # Create a socket to determine the local IP
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            local_ip = s.getsockname()[0]
            s.close()
            return local_ip
        except Exception:
            return "127.0.0.1"

    def get_hostname(self) -> str:
        """
        Get local hostname.
        
        Returns:
            Hostname string
        """
        return socket.gethostname()

    def find_free_port(
        self,
        min_port: int = 29500,
        max_port: int = 65535,
    ) -> int:
        """
        Find a free port on the local machine.
        
        Args:
            min_port: Minimum port number
            max_port: Maximum port number
            
        Returns:
            Free port number
        """
        for _ in range(100):  # Try up to 100 times
            port = random.randint(min_port, max_port)
            if self.is_port_free(port):
                return port
        
        # Fallback: let OS assign a port
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(('', 0))
            return s.getsockname()[1]

    def is_port_free(self, port: int, host: str = "localhost") -> bool:
        """
        Check if a port is free.
        
        Args:
            port: Port number to check
            host: Host address
            
        Returns:
            True if port is free
        """
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(1)
                s.bind((host, port))
                return True
        except OSError:
            return False

    def is_host_reachable(
        self,
        host: str,
        port: int,
        timeout: int = 5,
    ) -> bool:
        """
        Check if a host is reachable.
        
        Args:
            host: Host address
            port: Port number
            timeout: Timeout in seconds
            
        Returns:
            True if host is reachable
        """
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(timeout)
                s.connect((host, port))
                return True
        except (socket.timeout, socket.error, ConnectionRefusedError):
            return False

    def resolve_hostname(self, hostname: str) -> Optional[str]:
        """
        Resolve hostname to IP address.
        
        Args:
            hostname: Hostname to resolve
            
        Returns:
            IP address string or None
        """
        try:
            return socket.gethostbyname(hostname)
        except socket.gaierror:
            return None

    def get_master_addr_port(
        self,
        master_addr: Optional[str] = None,
        master_port: Optional[int] = None,
    ) -> Tuple[str, int]:
        """
        Get master address and port for distributed training.
        
        Args:
            master_addr: Master address (auto-detect if None)
            master_port: Master port (auto-assign if None)
            
        Returns:
            Tuple of (master_addr, master_port)
        """
        # Get master address
        if master_addr is None:
            master_addr = self.get_local_ip()
        
        # Get master port
        if master_port is None:
            master_port = self.find_free_port()
        
        return master_addr, master_port

    def validate_network_config(
        self,
        master_addr: str,
        master_port: int,
    ) -> Tuple[bool, str]:
        """
        Validate network configuration.
        
        Args:
            master_addr: Master address
            master_port: Master port
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        # Validate address
        if not master_addr:
            return False, "Master address is empty"
        
        # Try to resolve hostname
        ip = self.resolve_hostname(master_addr)
        if ip is None:
            return False, f"Cannot resolve hostname: {master_addr}"
        
        # Validate port
        if not (1024 <= master_port <= 65535):
            return False, f"Invalid port number: {master_port}"
        
        return True, ""


# Global instance
network_utils = NetworkUtils()
