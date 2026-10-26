import argon2 from "argon2";
import { stdin, stdout } from "node:process";

if (!stdin.isTTY || !stdout.isTTY) {
  console.error("Run this command in an interactive terminal so the password can be entered without echoing it.");
  process.exit(1);
}

function readHidden(prompt) {
  return new Promise((resolve, reject) => {
    stdout.write(prompt);
    let value = "";
    const onData = (chunk) => {
      const char = chunk.toString("utf8");
      if (char === "\u0003") {
        cleanup();
        reject(new Error("Cancelled."));
        return;
      }
      if (char === "\r" || char === "\n") {
        cleanup();
        stdout.write("\n");
        resolve(value);
        return;
      }
      if (char === "\u007f" || char === "\b") {
        value = value.slice(0, -1);
        return;
      }
      if (char.length === 1 && char >= " ") value += char;
    };
    function cleanup() {
      stdin.off("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
    }
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on("data", onData);
  });
}

try {
  const password = await readHidden("Enter a new admin password (minimum 14 characters): ");
  if (password.length < 14) {
    console.error("Use at least 14 characters. No hash was generated.");
    process.exitCode = 1;
  } else {
    const confirmation = await readHidden("Enter it again to confirm: ");
    if (password !== confirmation) {
      console.error("The entries did not match. No hash was generated.");
      process.exitCode = 1;
    } else {
      const hash = await argon2.hash(password, { type: argon2.argon2id });
      stdout.write("\nCopy this value to ADMIN_PASSWORD_HASH in your local environment and Vercel settings:\n\n");
      stdout.write(`${hash}\n\n`);
      stdout.write("The password itself was not printed. Store the hash as a server-only environment variable.\n");
    }
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Password hashing failed.");
  process.exitCode = 1;
}
