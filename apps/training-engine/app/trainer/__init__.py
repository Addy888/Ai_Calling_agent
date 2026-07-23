"""Enterprise HuggingFace Trainer Integration.

This module provides production-ready integration with HuggingFace Transformers Trainer.
Phase 4.4.4.5.2 - Basic trainer integration without LoRA, PEFT, or advanced features.
"""

from app.trainer.hf_trainer import HFTrainerWrapper, create_hf_trainer
from app.trainer.trainer_factory import TrainerFactory, trainer_factory
from app.trainer.trainer_builder import TrainerBuilder
from app.trainer.training_arguments import TrainingArgumentsBuilder
from app.trainer.interfaces import ITrainer, ITrainerBuilder

__all__ = [
    "HFTrainerWrapper",
    "create_hf_trainer",
    "TrainerFactory",
    "trainer_factory",
    "TrainerBuilder",
    "TrainingArgumentsBuilder",
    "ITrainer",
    "ITrainerBuilder",
]
