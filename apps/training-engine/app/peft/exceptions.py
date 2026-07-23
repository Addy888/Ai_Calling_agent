"""PEFT-specific exceptions."""


class PEFTException(Exception):
    """Base PEFT exception."""

    pass


class LoRAException(PEFTException):
    """LoRA-specific exception."""

    pass


class AdapterException(PEFTException):
    """Adapter management exception."""

    pass


class ConfigurationException(PEFTException):
    """PEFT configuration exception."""

    pass


class CompatibilityException(PEFTException):
    """Model/PEFT compatibility exception."""

    pass


class AdapterNotFoundError(AdapterException):
    """Adapter not found."""

    pass


class AdapterAlreadyExistsError(AdapterException):
    """Adapter already exists."""

    pass


class InvalidTargetModulesError(ConfigurationException):
    """Invalid target modules specified."""

    pass


class ModelNotCompatibleError(CompatibilityException):
    """Model not compatible with PEFT."""

    pass
