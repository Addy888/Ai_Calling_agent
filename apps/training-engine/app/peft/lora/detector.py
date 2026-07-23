"""Target module detection for LoRA."""

import re
from typing import List, Set

import torch.nn as nn

from app.logger import training_logger
from app.peft.exceptions import ConfigurationException, InvalidTargetModulesError


class TargetModuleDetector:
    """
    Detects and validates target modules for LoRA application.
    
    Automatically identifies common transformer module patterns
    and validates user-specified target modules.
    """

    # Common transformer module patterns
    COMMON_PATTERNS = [
        "q_proj",  # Query projection
        "k_proj",  # Key projection
        "v_proj",  # Value projection
        "o_proj",  # Output projection
        "gate_proj",  # Gate projection (Llama)
        "up_proj",  # Up projection (Llama)
        "down_proj",  # Down projection (Llama)
        "fc1",  # Feed-forward layer 1
        "fc2",  # Feed-forward layer 2
        "c_attn",  # Combined attention (GPT-2)
        "c_proj",  # Combined projection (GPT-2)
        "c_fc",  # Combined feed-forward (GPT-2)
    ]

    # Recommended module combinations by architecture
    ARCHITECTURE_PRESETS = {
        "default": ["q_proj", "v_proj"],
        "full_attention": ["q_proj", "k_proj", "v_proj", "o_proj"],
        "attention_only": ["q_proj", "k_proj", "v_proj"],
        "mlp_only": ["gate_proj", "up_proj", "down_proj"],
        "all_linear": ["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    }

    def __init__(self):
        """Initialize target module detector."""
        self.logger = training_logger

    def auto_detect_target_modules(
        self, model: nn.Module, preset: str = "default"
    ) -> List[str]:
        """
        Auto-detect target modules in model.
        
        Args:
            model: PyTorch model
            preset: Preset configuration (default, full_attention, etc.)
            
        Returns:
            List of detected target module names
        """
        self.logger.info(f"Auto-detecting target modules (preset: {preset})")

        # Get all module names
        all_modules = self._get_all_module_names(model)

        # Get preset patterns
        preset_patterns = self.ARCHITECTURE_PRESETS.get(
            preset, self.ARCHITECTURE_PRESETS["default"]
        )

        # Find matching modules
        detected = []
        for pattern in preset_patterns:
            matches = self._find_matching_modules(all_modules, pattern)
            if matches:
                detected.append(pattern)

        if not detected:
            # Fallback: find any linear layers
            self.logger.warning(
                "No preset modules found, falling back to linear layer detection"
            )
            detected = self._detect_linear_modules(model)

        if not detected:
            self.logger.warning("No target modules detected")
            # Return default patterns anyway
            detected = ["q_proj", "v_proj"]

        self.logger.info(f"Detected target modules: {detected}")

        return detected

    def validate_target_modules(
        self, model: nn.Module, target_modules: List[str]
    ) -> bool:
        """
        Validate target modules exist in model.
        
        Args:
            model: PyTorch model
            target_modules: Target module names/patterns
            
        Returns:
            True if valid
            
        Raises:
            InvalidTargetModulesError: If validation fails
        """
        self.logger.info(f"Validating target modules: {target_modules}")

        if not target_modules:
            raise InvalidTargetModulesError("target_modules cannot be empty")

        # Get all module names
        all_modules = self._get_all_module_names(model)

        # Check each target
        matched_any = False
        unmatched = []

        for target in target_modules:
            matches = self._find_matching_modules(all_modules, target)

            if matches:
                matched_any = True
                self.logger.info(
                    f"Target '{target}' matched {len(matches)} modules"
                )
            else:
                unmatched.append(target)

        if not matched_any:
            raise InvalidTargetModulesError(
                f"No modules matched target_modules: {target_modules}. "
                f"Available patterns: {self.COMMON_PATTERNS[:5]}"
            )

        if unmatched:
            self.logger.warning(
                f"Some targets did not match: {unmatched}"
            )

        self.logger.info("Target modules validated successfully")
        return True

    def get_available_modules(
        self, model: nn.Module, module_type: str = "linear"
    ) -> List[str]:
        """
        Get available modules of specified type.
        
        Args:
            model: PyTorch model
            module_type: Module type ('linear', 'attention', 'all')
            
        Returns:
            List of module names
        """
        all_modules = {}
        for name, module in model.named_modules():
            if name:
                all_modules[name] = type(module).__name__

        if module_type == "linear":
            # Return modules that are nn.Linear
            return [
                name for name, mod_type in all_modules.items()
                if mod_type == "Linear"
            ]
        elif module_type == "attention":
            # Return modules with attention-related names
            patterns = ["attn", "attention", "q_proj", "k_proj", "v_proj"]
            return [
                name for name in all_modules.keys()
                if any(p in name.lower() for p in patterns)
            ]
        else:
            # Return all modules
            return list(all_modules.keys())

    def get_module_stats(self, model: nn.Module) -> dict:
        """
        Get statistics about model modules.
        
        Args:
            model: PyTorch model
            
        Returns:
            Statistics dictionary
        """
        all_modules = list(model.named_modules())
        
        # Count module types
        module_types = {}
        linear_modules = []
        
        for name, module in all_modules:
            if not name:
                continue
                
            mod_type = type(module).__name__
            module_types[mod_type] = module_types.get(mod_type, 0) + 1
            
            if isinstance(module, nn.Linear):
                linear_modules.append(name)

        # Detect common patterns
        detected_patterns = {}
        all_names = {name for name, _ in all_modules if name}
        
        for pattern in self.COMMON_PATTERNS:
            matches = self._find_matching_modules(all_names, pattern)
            if matches:
                detected_patterns[pattern] = len(matches)

        stats = {
            "total_modules": len(all_modules) - 1,  # Exclude root
            "linear_modules": len(linear_modules),
            "module_types": module_types,
            "detected_patterns": detected_patterns,
            "recommended_targets": list(detected_patterns.keys())[:5],
        }

        return stats

    def _get_all_module_names(self, model: nn.Module) -> Set[str]:
        """
        Get all module names from model.
        
        Args:
            model: PyTorch model
            
        Returns:
            Set of module names
        """
        return {name for name, _ in model.named_modules() if name}

    def _find_matching_modules(
        self, all_modules: Set[str], pattern: str
    ) -> List[str]:
        """
        Find modules matching a pattern.
        
        Args:
            all_modules: Set of all module names
            pattern: Pattern to match
            
        Returns:
            List of matching module names
        """
        matches = []

        for module_name in all_modules:
            # Exact match
            if module_name == pattern:
                matches.append(module_name)
                continue

            # Suffix match (e.g., "layer.0.q_proj" matches "q_proj")
            if module_name.endswith(f".{pattern}"):
                matches.append(module_name)
                continue

            # Regex match (if pattern contains regex characters)
            if any(c in pattern for c in r".*+?[]{}()^$|\\"):
                try:
                    if re.search(pattern, module_name):
                        matches.append(module_name)
                except re.error:
                    pass

        return matches

    def _detect_linear_modules(self, model: nn.Module) -> List[str]:
        """
        Detect linear module patterns as fallback.
        
        Args:
            model: PyTorch model
            
        Returns:
            List of linear module pattern names
        """
        linear_modules = []

        for name, module in model.named_modules():
            if isinstance(module, nn.Linear) and name:
                linear_modules.append(name)

        if not linear_modules:
            return []

        # Extract unique suffixes
        suffixes = set()
        for name in linear_modules:
            parts = name.split(".")
            if parts:
                suffixes.add(parts[-1])

        # Return common suffixes
        return sorted(suffixes)[:5]

    def recommend_target_modules(
        self, model: nn.Module, efficiency: str = "balanced"
    ) -> dict:
        """
        Recommend target modules based on efficiency preference.
        
        Args:
            model: PyTorch model
            efficiency: Efficiency preference ('fast', 'balanced', 'quality')
            
        Returns:
            Recommendation dictionary
        """
        stats = self.get_module_stats(model)
        detected = stats["detected_patterns"]

        recommendations = {
            "fast": {
                "modules": ["q_proj", "v_proj"],
                "description": "Minimal modules for fastest training",
            },
            "balanced": {
                "modules": ["q_proj", "k_proj", "v_proj", "o_proj"],
                "description": "Attention layers for good balance",
            },
            "quality": {
                "modules": [
                    "q_proj", "k_proj", "v_proj", "o_proj",
                    "gate_proj", "up_proj", "down_proj"
                ],
                "description": "All major layers for best quality",
            },
        }

        preset = recommendations.get(efficiency, recommendations["balanced"])

        # Filter to only detected modules
        available = [m for m in preset["modules"] if m in detected]

        if not available:
            available = list(detected.keys())[:4]

        return {
            "recommended": available,
            "description": preset["description"],
            "efficiency": efficiency,
            "estimated_params": f"{len(available)}x per layer",
        }


# Global instance
target_module_detector = TargetModuleDetector()
