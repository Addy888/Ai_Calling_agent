"""Enterprise PEFT & LoRA Integration Engine.

This module provides production-ready integration with HuggingFace PEFT library.
Phase 4.4.4.5.3 - LoRA adapter-based fine-tuning with extension interfaces.
"""

from app.peft.adapter.manager import AdapterManager, adapter_manager
from app.peft.adapter.registry import AdapterRegistry, adapter_registry
from app.peft.adapter.runtime import AdapterRuntime, adapter_runtime
from app.peft.factory import PEFTFactory, peft_factory
from app.peft.interfaces import IAdapterBuilder, IPEFTManager
from app.peft.lora.builder import LoRABuilder, lora_builder
from app.peft.lora.config import LoRAConfigFactory, lora_config_factory
from app.peft.lora.detector import TargetModuleDetector, target_module_detector
from app.peft.manager import PEFTManager, peft_manager
from app.peft.validator import PEFTValidator, peft_validator

__all__ = [
    "PEFTManager",
    "peft_manager",
    "PEFTFactory",
    "peft_factory",
    "LoRABuilder",
    "lora_builder",
    "LoRAConfigFactory",
    "lora_config_factory",
    "TargetModuleDetector",
    "target_module_detector",
    "AdapterManager",
    "adapter_manager",
    "AdapterRegistry",
    "adapter_registry",
    "AdapterRuntime",
    "adapter_runtime",
    "PEFTValidator",
    "peft_validator",
    "IPEFTManager",
    "IAdapterBuilder",
]
