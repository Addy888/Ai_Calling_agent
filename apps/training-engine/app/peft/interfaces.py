"""PEFT interfaces and protocols."""

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional, Protocol

from torch.nn import Module


class IPEFTManager(Protocol):
    """Interface for PEFT managers."""

    def load_config(self, config: Dict[str, Any]) -> Any:
        """Load PEFT configuration."""
        ...

    def validate_config(self, config: Any) -> bool:
        """Validate PEFT configuration."""
        ...

    def apply_adapter(self, model: Module, config: Any) -> Module:
        """Apply adapter to model."""
        ...

    def remove_adapter(self, model: Module, adapter_name: str) -> Module:
        """Remove adapter from model."""
        ...


class IAdapterBuilder(Protocol):
    """Interface for adapter builders."""

    def build_config(self, params: Dict[str, Any]) -> Any:
        """Build adapter configuration."""
        ...

    def validate_params(self, params: Dict[str, Any]) -> bool:
        """Validate adapter parameters."""
        ...

    def detect_target_modules(self, model: Module) -> list[str]:
        """Detect target modules in model."""
        ...


class AdapterComponent(ABC):
    """Base class for adapter components."""

    @abstractmethod
    def initialize(self, config: Dict[str, Any]) -> None:
        """Initialize component."""
        pass

    @abstractmethod
    def validate(self, model: Module) -> bool:
        """Validate component with model."""
        pass

    @abstractmethod
    def apply(self, model: Module) -> Module:
        """Apply component to model."""
        pass

    @abstractmethod
    def cleanup(self) -> None:
        """Cleanup component resources."""
        pass


class IAdapterRuntime(Protocol):
    """Interface for adapter runtime."""

    def get_metadata(self, adapter_id: str) -> Dict[str, Any]:
        """Get adapter metadata."""
        ...

    def list_adapters(self) -> list[Dict[str, Any]]:
        """List all adapters."""
        ...

    def is_adapter_active(self, adapter_id: str) -> bool:
        """Check if adapter is active."""
        ...
