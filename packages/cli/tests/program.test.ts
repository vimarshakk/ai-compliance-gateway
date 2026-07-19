import { describe, it, expect } from 'vitest';
import { createProgram } from '../src/program.js';

describe('CLI Program', () => {
  it('should create a program with all commands', () => {
    const program = createProgram();
    const commands = program.commands.map(c => c.name());
    expect(commands).toContain('scan');
    expect(commands).toContain('bom');
    expect(commands).toContain('score');
    expect(commands).toContain('simulate');
    expect(commands).toContain('providers');
    expect(commands).toContain('packs');
  });

  it('should have version set', () => {
    const program = createProgram();
    expect(program.version()).toBe('0.1.0');
  });

  it('should have name set', () => {
    const program = createProgram();
    expect(program.name()).toBe('acg');
  });
});
