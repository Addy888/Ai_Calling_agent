"""PEFT Manager - Core PEFT management."""

from typing import Any, Dict, Optional, Tuple

import torch.nn as nn
from peft import PeftModel

from app.events import event_bus
from app.logger import training_logger
from app.peft.adapter.manager import AdapterManager, adapter_manager
from app.peft.exceptions import PEFTException, AdapterException
from app.peft.lora.builder import LoRABuilder, lora_builder
from app.peft.schemas import (
    AdapterMetadata,
    AdapterType,
    CreatePEFTRequest,
    LoRAConfigRequest,
)
from app.peft.validator import PEFTValidator, peft_validator


class PEFTManager:
    """
    Core PEFT management system.
    
    Responsibilities:
    - Load and validate PEFT configurations
    - Apply PEFT adapters to models
    - Remove adapters from models
    - Manage adapter lifecycle
    - Coordinate between components
    """

    def __init__(
        self,
        lora_builder: Optional[LoRABuilder] = None,
        adapter_manager: Optional[AdapterManager] = None,
        validator: Optional[PEFTValidator] = None,
    ):
        """
        Initialize PEFT manager.
        
        Args:
            lora_builder: Optional LoRABuilder instance
            adapter_manager: Optional AdapterManager instance
            validator: Optional PEFTValidator instance
        """
        self.logger = training_logger
        self.lora_builder = lora_builder or lora_builder
        self.adapter_manager = adapter_manager or adapter_manager
        self.validator = validator or peft_validator

        self.logger.info("PEFT Manager initialized")

    def create_adapter(
        self,
        model: nn.Module,
        request: CreatePEFTRequest,
    ) -> Tuple[nn.Module, AdapterMetadata]:
        """
        Create and apply PEFT adapter to model.
        
        Args:
            model: Base PyTorch model
            request: PEFT creation request
            
        Returns:
            Tuple of (PEFT model, adapter metadata)
            
        Raises:
            PEFTException: If adapter creation fails
        """
        self.logger.info(
            f"Creating {request.adapter_type.value} adapter for model {request.model_id}"
        )

        try:
            # Validate environment
            self.validator.validate_environment()

            # Validate model
            self.validator.validate_model(model)

            # Validate adapter type
            self.validator.validate_adapter_type(request.adapter_type)

            # Route to appropriate builder
            if request.adapter_type == AdapterType.LORA:
                peft_model, metadata = self._create_lora_adapter(
                    model, request
                )
            else:
                raise PEFTException(
                    f"Adapter type {request.adapter_type.value} not implemented"
                )

            # Register adapter
            self.adapter_manager.register_adapter(
                metadata, model_id=request.model_id
            )

            # Emit event
            event_bus.emit(
                "adapter_created",
                {
                    "adapter_id": metadata.adapter_id,
                    "adapter_name": metadata.adapter_name,
                    "adapter_type": metadata.adapter_type.value,
                    "model_id": request.model_id,
                    "trainable_params": metadata.trainable_params,
                },
            )

            self.logger.info(
                f"Adapter created successfully: {metadata.adapter_name}"
            )

            return peft_model, metadata

        except Exception as e:
            self.logger.error(f"Failed to create adapter: {str(e)}")
            raise PEFTException(f"Adapter creation failed: {str(e)}")

    def apply_adapter(
        self,
        model: nn.Module,
        adapter_id: str,
        model_id: str,
    ) -> nn.Module:
        """
        Apply existing adapter to model.
        
        Args:
            model: Base PyTorch model
            adapter_id: Adapter ID to apply
            model_id: Model ID
            
        Returns:
            PEFT model
            
        Raises:
            AdapterException: If adapter application fails
        """
        self.logger.info(f"Applying adapter {adapter_id} to model {model_id}")

        try:
            # Get adapter metadata
            metadata = self.adapter_manager.get_adapter(adapter_id)

            # Validate model
            self.validator.validate_model(model)

            # Validate adapter compatibility
            if not self.adapter_manager.validate_adapter_compatibility(
                adapter_id, model
            ):
                raise AdapterException(
                    f"Adapter {adapter_id} not compatible with model"
                )

            # Note: In a production system, we would load the adapter weights
            # from storage and apply them. For this phase, we assume the
            # adapter is being created fresh with create_adapter().

            # Set as active adapter
            self.adapter_manager.set_active_adapter(model_id, adapter_id)

            # Emit event
            event_bus.emit(
                "adapter_applied",
                {
                    "adapter_id": adapter_id,
                    "model_id": model_id,
                    "adapter_name": metadata.adapter_name,
                },
            )

            self.logger.info(
                f"Adapter {adapter_id} applied successfully to model {model_id}"
            )

            return model

        except Exception as e:
            self.logger.error(f"Failed to apply adapter: {str(e)}")
            raise AdapterException(f"Adapter application failed: {str(e)}")

    def remove_adapter(
        self,
        model: nn.Module,
        adapter_name: str,
        model_id: str,
    ) -> nn.Module:
        """
        Remove adapter from model.
        
        Args:
            model: PEFT model
            adapter_name: Adapter name to remove
            model_id: Model ID
            
        Returns:
            Model with adapter removed
            
        Raises:
            AdapterException: If adapter removal fails
        """
        self.logger.info(
            f"Removing adapter {adapter_name} from model {model_id}"
        )

        try:
            # Check if model is a PEFT model
            if not isinstance(model, PeftModel):
                self.logger.warning(
                    "Model is not a PeftModel, nothing to remove"
                )
                return model

            # Get base model
            base_model = model.get_base_model()

            # Clear active adapter for this model
            self.adapter_manager.clear_active_adapter(model_id)

            # Emit event
            event_bus.emit(
                "adapter_removed",
                {
                    "adapter_name": adapter_name,
                    "model_id": model_id,
                },
            )

            self.logger.info(
                f"Adapter {adapter_name} removed from model {model_id}"
            )

            return base_model

        except Exception as e:
            self.logger.error(f"Failed to remove adapter: {str(e)}")
            raise AdapterException(f"Adapter removal failed: {str(e)}")

    def validate_configuration(
        self,
        model: nn.Module,
        adapter_type: AdapterType,
        config: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Validate PEFT configuration.
        
        Args:
            model: PyTorch model
            adapter_type: Adapter type
            config: Configuration dictionary
            
        Returns:
            Validation result dictionary
        """
        self.logger.info(f"Validating {adapter_type.value} configuration")

        try:
            # Validate adapter type
            self.validator.validate_adapter_type(adapter_type)

            # Route to appropriate validator
            if adapter_type == AdapterType.LORA:
                return self.validator.get_validation_report(model, config)
            else:
                return {
                    "valid": False,
                    "issues": [
                        f"Adapter type {adapter_type.value} not supported"
                    ],
                }

        except Exception as e:
            self.logger.error(f"Configuration validation failed: {str(e)}")
            return {
                "valid": False,
                "issues": [str(e)],
            }

    def get_adapter_info(self, adapter_id: str) -> Dict[str, Any]:
        """
        Get adapter information.
        
        Args:
            adapter_id: Adapter ID
            
        Returns:
            Adapter information dictionary
        """
        try:
            metadata = self.adapter_manager.get_adapter(adapter_id)
            return metadata.model_dump()

        except Exception as e:
            self.logger.error(f"Failed to get adapter info: {str(e)}")
            raise

    def list_adapters(
        self,
        model_id: Optional[str] = None,
        adapter_type: Optional[str] = None,
    ) -> list[Dict[str, Any]]:
        """
        List adapters with optional filters.
        
        Args:
            model_id: Optional model ID filter
            adapter_type: Optional adapter type filter
            
        Returns:
            List of adapter information dictionaries
        """
        try:
            adapters = self.adapter_manager.list_adapters(
                model_id=model_id,
                adapter_type=adapter_type,
            )

            return [a.model_dump() for a in adapters]

        except Exception as e:
            self.logger.error(f"Failed to list adapters: {str(e)}")
            raise

    def _create_lora_adapter(
        self,
        model: nn.Module,
        request: CreatePEFTRequest,
    ) -> Tuple[nn.Module, AdapterMetadata]:
        """
        Create LoRA adapter.
        
        Args:
            model: Base model
            request: PEFT request
            
        Returns:
            Tuple of (PEFT model, adapter metadata)
        """
        # Use provided config or create default
        lora_config = request.lora_config or LoRAConfigRequest()

        # Validate LoRA parameters
        self.lora_builder.validate_params(lora_config)

        # Build and apply LoRA
        peft_model, metadata = self.lora_builder.build_and_apply(
            model=model,
            params=lora_config,
            adapter_name=request.adapter_name,
            base_model_id=request.model_id,
        )

        return peft_model, metadata


# Global instance
peft_manager = PEFTManager()
