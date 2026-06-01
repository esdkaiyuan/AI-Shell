import { CommandController } from '../types';
import {
  AICommandController,
  ExplainController,
  TranslateController,
  SuggestController,
  FixController,
  OptimizeController,
} from './ai-controllers';

export class ControllerRegistry {
  private controllers: Map<string, CommandController> = new Map();

  constructor() {
    this.registerDefaultControllers();
  }

  private registerDefaultControllers(): void {
    const defaultControllers = [
      new AICommandController(),
      new ExplainController(),
      new TranslateController(),
      new SuggestController(),
      new FixController(),
      new OptimizeController(),
    ];

    defaultControllers.forEach(controller => {
      this.register(controller);
    });
  }

  register(controller: CommandController): void {
    this.controllers.set(controller.name, controller);
  }

  unregister(name: string): void {
    this.controllers.delete(name);
  }

  get(name: string): CommandController | undefined {
    return this.controllers.get(name);
  }

  list(): CommandController[] {
    return Array.from(this.controllers.values());
  }

  has(name: string): boolean {
    return this.controllers.has(name);
  }
}
