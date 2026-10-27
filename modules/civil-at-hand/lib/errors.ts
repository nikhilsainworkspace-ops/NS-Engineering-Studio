/** Thrown for problems caused by the information a person typed (shown to them as a 400 message). */
export class InputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InputError";
  }
}
