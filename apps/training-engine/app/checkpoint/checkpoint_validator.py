"""Checkpoint validation."""

import hashlib
from pathlib import Path
from typing import List, Tuple

import torch

from app.logger import training_logger
from app.checkpoint.exceptions import CheckpointValidationException


class CheckpointValidator:
    """
    Validates checkpoint integrity and compatibility.
    
    Ensures checkpoints are valid and can be restored.
    """

    def __init__(self):
        """Initialize checkpoint validator."""
        self.logger = training_logger

    def validate_checkpoint(self, checkpoint_path: Path) -> Tuple[bool, List[str]]:
        """
        Validate checkpoint file.
        
        Args:
            checkpoint_path: Path to checkpoint file
            
        Returns:
            Tuple of (is_valid, list_of_errors)
        """
        self.logger.info(f"Validating checkpoint: {checkpoint_path}")
        
        errors = []
        
        # Check file exists
        if not checkpoint_path.exists():
            errors.append(f"Checkpoint file does not exist: {checkpoint_path}")
            return False, errors
        
        # Check file is not empty
        if checkpoint_path.stat().st_size == 0:
            errors.append("Checkpoint file is empty")
            return False, errors
        
        # Try to load checkpoint
        try:
            state_dict = torch.load(checkpoint_path, map_location="cpu")
            
            # Validate structure
            validation_errors = self._validate_structure(state_dict)
            errors.extend(validation_errors)
            
        except Exception as e:
            errors.append(f"Failed to load checkpoint: {str(e)}")
            return False, errors
        
        is_valid = len(errors) == 0
        
        if is_valid:
            self.logger.info(f"Checkpoint validation passed: {checkpoint_path}")
        else:
            self.logger.warning(
                f"Checkpoint validation failed: {checkpoint_path}, "
                f"errors: {errors}"
            )
        
        return is_valid, errors

    def _validate_structure(self, state_dict: dict) -> List[str]:
        """
        Validate checkpoint structure.
        
        Args:
            state_dict: Loaded state dictionary
            
        Returns:
            List of validation errors
        """
        errors = []
        
        # Check for required keys
        required_keys = ["checkpoint_metadata"]
        for key in required_keys:
            if key not in state_dict:
                errors.append(f"Missing required key: {key}")
        
        # Validate metadata
        if "checkpoint_metadata" in state_dict:
            metadata = state_dict["checkpoint_metadata"]
            
            required_metadata = ["checkpoint_id", "job_id", "global_step"]
            for key in required_metadata:
                if key not in metadata:
                    errors.append(f"Missing metadata key: {key}")
        
        return errors

    def compute_hash(self, checkpoint_path: Path) -> str:
        """
        Compute checkpoint file hash.
        
        Args:
            checkpoint_path: Path to checkpoint file
            
        Returns:
            SHA256 hash
        """
        self.logger.debug(f"Computing hash for: {checkpoint_path}")
        
        sha256_hash = hashlib.sha256()
        
        with open(checkpoint_path, "rb") as f:
            for byte_block in iter(lambda: f.read(8192), b""):
                sha256_hash.update(byte_block)
        
        return sha256_hash.hexdigest()

    def verify_hash(self, checkpoint_path: Path, expected_hash: str) -> bool:
        """
        Verify checkpoint file hash.
        
        Args:
            checkpoint_path: Path to checkpoint file
            expected_hash: Expected hash
            
        Returns:
            True if hash matches
        """
        actual_hash = self.compute_hash(checkpoint_path)
        matches = actual_hash == expected_hash
        
        if not matches:
            self.logger.warning(
                f"Hash mismatch for {checkpoint_path}: "
                f"expected={expected_hash}, actual={actual_hash}"
            )
        
        return matches

    def validate_compatibility(
        self,
        checkpoint_metadata: dict,
        current_config: dict,
    ) -> Tuple[bool, List[str]]:
        """
        Validate checkpoint compatibility with current configuration.
        
        Args:
            checkpoint_metadata: Checkpoint metadata
            current_config: Current training configuration
            
        Returns:
            Tuple of (is_compatible, list_of_warnings)
        """
        warnings = []
        
        # Check model compatibility
        if "model_name" in checkpoint_metadata and "model_name" in current_config:
            if checkpoint_metadata["model_name"] != current_config["model_name"]:
                warnings.append(
                    f"Model mismatch: checkpoint uses {checkpoint_metadata['model_name']}, "
                    f"current config uses {current_config['model_name']}"
                )
        
        # Check adapter compatibility
        if "adapter_name" in checkpoint_metadata and "adapter_name" in current_config:
            if checkpoint_metadata["adapter_name"] != current_config["adapter_name"]:
                warnings.append(
                    f"Adapter mismatch: checkpoint uses {checkpoint_metadata['adapter_name']}, "
                    f"current config uses {current_config['adapter_name']}"
                )
        
        # Compatibility is loose - we allow warnings but not hard failures
        is_compatible = True
        
        return is_compatible, warnings

    def quick_validate(self, checkpoint_path: Path) -> bool:
        """
        Quick validation (file exists and loadable).
        
        Args:
            checkpoint_path: Path to checkpoint file
            
        Returns:
            True if passes quick validation
        """
        if not checkpoint_path.exists():
            return False
        
        try:
            torch.load(checkpoint_path, map_location="cpu")
            return True
        except Exception:
            return False


# Global instance
checkpoint_validator = CheckpointValidator()
