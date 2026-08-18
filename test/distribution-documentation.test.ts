import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readme = readFileSync(
  resolve(import.meta.dirname, "..", "README.md"),
  "utf8",
);
const distributionSection = readme.match(
  /^## Install the released Proxmox MCP\n([\s\S]*?)(?=\n## |$(?![\s\S]))/m,
)?.[0];

describe("released distribution documentation", () => {
  it("directs local stdio installs to the verified GitHub Release archive", () => {
    expect(distributionSection).toBeDefined();
    expect(distributionSection).toContain(
      "https://github.com/Theorvane/proxmox-mcp/releases/tag/v0.1.1",
    );
    expect(distributionSection).toContain(
      "https://github.com/Theorvane/proxmox-mcp/releases/download/v0.1.1/proxmox-mcp-0.1.1.tar.gz",
    );
    expect(distributionSection).toContain(
      "https://github.com/Theorvane/proxmox-mcp/releases/download/v0.1.1/proxmox-mcp-0.1.1.tar.gz.sha256",
    );
    expect(distributionSection).toMatch(
      /checksum-verified GitHub Release archive/i,
    );
    expect(distributionSection).toMatch(/There is no npm package/i);
  });

  it("describes marketplace availability without inventing a ClawHub install path", () => {
    expect(distributionSection).toContain(
      "https://lobehub.com/mcp/theorvane-proxmox-mcp",
    );
    expect(distributionSection).toMatch(/LobeHub.*capabilit/i);
    expect(distributionSection).toMatch(
      /ClawHub.*not currently published.*publicly installable OpenClaw wrapper\/listing.*not available/i,
    );
    expect(distributionSection).not.toMatch(
      /\[[^\]]*ClawHub[^\]]*\]\([^)]*\)/i,
    );
  });
});
