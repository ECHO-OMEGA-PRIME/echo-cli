# Echo Prime CLI (`echo`)

> `@echo-omega-prime/cli` — query intelligence engines, search the Knowledge Forge
> and Shared Brain, generate doctrine, run bots/scrapers, and manage your account,
> all from the terminal. Every call routes through the Echo SDK gateway.

Proprietary software of Echo Prime Technologies. Requires Node ≥ 20.

## Install

From the GitHub Packages registry:

```bash
npm install -g @echo-omega-prime/cli
```

Or build from source:

```bash
git clone https://github.com/ECHO-OMEGA-PRIME/echo-cli.git
cd echo-cli
npm install
npm run build      # tsc -> dist/
npm link           # exposes the `echo` binary
```

## Quickstart

```bash
echo config init <your-api-key>     # store your API key + gateway
echo status                         # health + connectivity check
echo engine query "what is the oilfield severance tax in TX?"
```

## Global options

| Flag | Description | Default |
|---|---|---|
| `-k, --api-key <key>` | API key (overrides config) | from config |
| `-f, --format <fmt>` | Output format: `json` \| `table` \| `text` | `text` |
| `--gateway <url>` | Gateway URL override | from config |
| `--verbose` | Verbose output | off |
| `-v, --version` | Print version | — |

## Commands

| Group | Subcommands | Purpose |
|---|---|---|
| `config` | `init`, `set <k> <v>`, `get [k]`, `path` | Manage CLI config (apiKey, gatewayUrl, defaultDomain, outputFormat) |
| `status` | — | System health and connectivity |
| `doctor` | — | Diagnose connectivity / configuration issues |
| `engine` | `query <q>`, `list`, `search <q>`, `info <id>`, `status` | Query and explore intelligence engines |
| `knowledge` (`kg`) | `search <q>`, `categories` | Search the Knowledge Forge |
| `brain` | `search <q>`, `store <content>`, `recall <key>`, `stats` | Shared Brain memory system |
| `doctrine` (`doc`) | `generate <domain> <topic>`, `list`, `providers` | Generate / manage doctrine blocks |
| `chat <message>` | — | Chat with Echo Prime AI (14 personalities) |
| `search <query>` | — | Unified search across engines, knowledge, and brain |
| `tools` | `search <q>`, `list`, `chains`, `recommend <task>`, `stats` | Discover ECHO tools and capabilities |
| `bots` | `templates`, `deploy <id>`, `list`, `logs <id>` | Bot Factory — deploy and manage bots |
| `scrapers` (`scrape`) | `templates`, `run <id>`, `jobs`, `results <id>` | Scraper Orchestrator |
| `dashboard` (`dash`) | `usage`, `tenants`, `audit` | SDK usage dashboard and analytics |
| `auth` | `create-key <name>`, `list-keys`, … | Manage API keys and authentication |

Run `echo <group> --help` for the full options of any command.

## Examples

```bash
echo -f table engine list                       # engine domains as a table
echo kg search "homestead exemption" -l 5        # 5 knowledge hits
echo brain store "deal closed with Acme" -i 8 -t sales,wins
echo doctrine generate tax "1031 exchange"       # generate a doctrine block
echo --format json status                         # machine-readable health
```

## Configuration

Config is stored via [`conf`](https://github.com/sindresorhus/conf) (run
`echo config path` to see the file). Keys: `apiKey`, `gatewayUrl`,
`defaultDomain`, `outputFormat`. The API key can also be supplied per-call with
`-k` or via the `ECHO_API_KEY` environment variable.

## Development

```bash
npm run dev        # tsx src/index.ts (no build)
npm run lint       # eslint src/
npm test           # vitest run
```

## License

Proprietary — © Echo Prime Technologies. All rights reserved.
