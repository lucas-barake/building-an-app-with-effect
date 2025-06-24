# Monorepo Overview

A monorepo containing four packages:

- `packages/client`: A Vite React application
- `packages/server`: Backend server
- `packages/domain`: Shared domain logic consumed by both client and server
- `packages/database`: Database schema and migrations

## Prerequisites and Setup

### Docker Requirements

This project requires Docker and Docker Compose to be installed on your system:

- [Install Docker](https://docs.docker.com/get-docker/)
- [Install Docker Compose](https://docs.docker.com/compose/install/)

### Using Nix

Using Nix ensures that all developers have the exact same development environment, eliminating "it works on my machine" problems.

#### Why Nix?

Nix provides several benefits for development:

1. **Reproducible environments**: Everyone on the team gets exactly the same development environment with the same versions of all tools.

2. **Declarative configuration**: All dependencies are explicitly declared in the `flake.nix` file.

3. **Isolation**: The development environment is isolated from your system, preventing conflicts with globally installed packages.

4. **Cross-platform**: Works the same way on macOS, Linux, and WSL on Windows.

5. **Simpler than containerization**: Unlike Docker-based setups that require port mapping and container networking, Nix environments run natively while maintaining isolation. This eliminates the need for volume mounts and container-to-host port exposure, while preserving direct filesystem access to your source code and providing better performance through native execution.

#### Setup Steps

1. Install Nix:

   ```bash
   # For macOS and Linux
   sh <(curl -L https://nixos.org/nix/install) --daemon

   # For more installation options, visit:
   # https://nixos.org/download.html
   ```

2. Enable Flakes (if not already enabled):

   ```bash
   # Add this to ~/.config/nix/nix.conf or /etc/nix/nix.conf
   experimental-features = nix-command flakes
   ```

3. Start a Nix shell with your current shell:

   ```bash
   # From the project root
   nix shell -c $SHELL
   ```

   The `-c $SHELL` option starts your current shell inside the Nix environment, which preserves your shell configuration, aliases, and history. This gives you a more comfortable development experience compared to the default Nix shell.

   This will automatically set up all required tools with the correct versions.

4. Install dependencies:

   ```bash
   pnpm install
   ```

5. Start the Jaeger instance for local telemetry:

   ```bash
   # Make sure you have Docker and Docker Compose installed on your system
   docker-compose up -d
   ```

   You can view the Jaeger UI at: http://localhost:16686/search

6. Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

   Update any values in the `.env` file as needed.

## Development

### Running Packages in Development Mode

Before running any commands, make sure you're in a Nix shell as described above.

```bash
# Start the client
pnpm --filter client dev

# Start the server
pnpm --filter server dev
```

For the best development experience, run the server and client in separate terminal windows (each in its own Nix shell).

## Operations

### Building Packages

**Building All Packages**

To build all packages in the monorepo:

```sh
pnpm build
```

**Building a Specific Package**

To build a specific package:

```sh
pnpm --filter client build
pnpm --filter server build
pnpm --filter domain build
pnpm --filter database build
```

### Installing Dependencies

To add dependencies to a specific package:

```sh
# Add a production dependency
pnpm add --filter client react-router-dom

# Add a development dependency
pnpm add -D --filter client @types/react
```

### Checking and Testing

```sh
# Run all checks
pnpm check:all

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch
```
