import { McpServer, McpTool } from "@theorvane/type-mcp";
import { z } from "zod";
import { apiPath, nodeSchema } from "./node.js";
import type { ProxmoxClient } from "./proxmox-client.js";
import { requireDestructiveConfirmation } from "./safety.js";
import { taskReceipt } from "./task-receipt.js";

const node = nodeSchema;
const target = z.object({ node, vmid: z.number().int().positive() });
const confirmation = target.extend({ confirm: z.literal(true) });
const text = (value: unknown) => JSON.stringify(value);

@McpServer({ name: "proxmox-mcp", version: "0.1.0" })
export class ProxmoxMcpServer {
  public client!: ProxmoxClient;
  @McpTool({
    name: "cluster_version",
    description: "Read cluster version.",
    input: z.object({}),
  })
  async clusterVersion() {
    return text(await this.client.get("version"));
  }
  @McpTool({
    name: "cluster_resources",
    description: "List cluster resources.",
    input: z.object({ type: z.enum(["vm", "storage", "node"]).optional() }),
  })
  async clusterResources(input: { type?: "vm" | "storage" | "node" }) {
    return text(await this.client.get("cluster/resources", input));
  }
  @McpTool({
    name: "list_nodes",
    description: "List nodes.",
    input: z.object({}),
  })
  async listNodes() {
    return text(await this.client.get("nodes"));
  }
  @McpTool({
    name: "node_status",
    description: "Read node status.",
    input: z.object({ node }),
  })
  async nodeStatus({ node: nodeName }: { node: string }) {
    return text(await this.client.get(apiPath("nodes", nodeName, "status")));
  }
  @McpTool({
    name: "list_storage",
    description: "List node storage.",
    input: z.object({ node }),
  })
  async listStorage({ node: nodeName }: { node: string }) {
    return text(await this.client.get(apiPath("nodes", nodeName, "storage")));
  }
  @McpTool({
    name: "list_qemu",
    description: "List QEMU VMs on a node.",
    input: z.object({ node }),
  })
  async listQemu({ node: nodeName }: { node: string }) {
    return text(await this.client.get(apiPath("nodes", nodeName, "qemu")));
  }
  @McpTool({
    name: "list_lxc",
    description: "List LXC containers on a node.",
    input: z.object({ node }),
  })
  async listLxc({ node: nodeName }: { node: string }) {
    return text(await this.client.get(apiPath("nodes", nodeName, "lxc")));
  }
  @McpTool({
    name: "list_tasks",
    description: "List node tasks.",
    input: z.object({ node }),
  })
  async listTasks({ node: nodeName }: { node: string }) {
    return text(await this.client.get(apiPath("nodes", nodeName, "tasks")));
  }
  @McpTool({
    name: "task_status",
    description: "Read task status.",
    input: z.object({ node, upid: z.string().min(1) }),
  })
  async taskStatus({ node: nodeName, upid }: { node: string; upid: string }) {
    return text(
      await this.client.get(
        apiPath("nodes", nodeName, "tasks", upid, "status"),
      ),
    );
  }
  @McpTool({
    name: "qemu_start",
    description: "Start a QEMU VM.",
    input: target,
  })
  async qemuStart(input: z.infer<typeof target>) {
    return taskReceipt(
      await this.client.post(
        apiPath("nodes", input.node, "qemu", input.vmid, "status", "start"),
      ),
      "qemu",
      input.node,
      input.vmid,
    );
  }
  @McpTool({
    name: "qemu_shutdown",
    description: "Gracefully shut down a QEMU VM.",
    input: target,
  })
  async qemuShutdown(input: z.infer<typeof target>) {
    return taskReceipt(
      await this.client.post(
        apiPath("nodes", input.node, "qemu", input.vmid, "status", "shutdown"),
      ),
      "qemu",
      input.node,
      input.vmid,
    );
  }
  @McpTool({ name: "qemu_stop", description: "Stop a QEMU VM.", input: target })
  async qemuStop(input: z.infer<typeof target>) {
    return taskReceipt(
      await this.client.post(
        apiPath("nodes", input.node, "qemu", input.vmid, "status", "stop"),
      ),
      "qemu",
      input.node,
      input.vmid,
    );
  }
  @McpTool({
    name: "qemu_reboot",
    description: "Reboot a QEMU VM.",
    input: target,
  })
  async qemuReboot(input: z.infer<typeof target>) {
    return taskReceipt(
      await this.client.post(
        apiPath("nodes", input.node, "qemu", input.vmid, "status", "reboot"),
      ),
      "qemu",
      input.node,
      input.vmid,
    );
  }
  @McpTool({
    name: "lxc_start",
    description: "Start an LXC container.",
    input: target,
  })
  async lxcStart(input: z.infer<typeof target>) {
    return taskReceipt(
      await this.client.post(
        apiPath("nodes", input.node, "lxc", input.vmid, "status", "start"),
      ),
      "lxc",
      input.node,
      input.vmid,
    );
  }
  @McpTool({
    name: "lxc_shutdown",
    description: "Gracefully shut down an LXC container.",
    input: target,
  })
  async lxcShutdown(input: z.infer<typeof target>) {
    return taskReceipt(
      await this.client.post(
        apiPath("nodes", input.node, "lxc", input.vmid, "status", "shutdown"),
      ),
      "lxc",
      input.node,
      input.vmid,
    );
  }
  @McpTool({
    name: "lxc_stop",
    description: "Stop an LXC container.",
    input: target,
  })
  async lxcStop(input: z.infer<typeof target>) {
    return taskReceipt(
      await this.client.post(
        apiPath("nodes", input.node, "lxc", input.vmid, "status", "stop"),
      ),
      "lxc",
      input.node,
      input.vmid,
    );
  }
  @McpTool({
    name: "lxc_reboot",
    description: "Reboot an LXC container.",
    input: target,
  })
  async lxcReboot(input: z.infer<typeof target>) {
    return taskReceipt(
      await this.client.post(
        apiPath("nodes", input.node, "lxc", input.vmid, "status", "reboot"),
      ),
      "lxc",
      input.node,
      input.vmid,
    );
  }
  @McpTool({
    name: "qemu_create",
    description: "Create a QEMU VM.",
    input: target.extend({
      name: z.string().min(1).optional(),
      memory: z.number().int().positive().optional(),
      cores: z.number().int().positive().optional(),
    }),
  })
  async qemuCreate({
    node,
    ...body
  }: z.infer<typeof target> & Record<string, unknown>) {
    return taskReceipt(
      await this.client.post(apiPath("nodes", node, "qemu"), body),
      "qemu",
      node,
      body.vmid as number,
    );
  }
  @McpTool({
    name: "lxc_create",
    description: "Create an LXC container.",
    input: target.extend({
      ostemplate: z.string().min(1),
      hostname: z.string().min(1),
    }),
  })
  async lxcCreate({
    node,
    ...body
  }: z.infer<typeof target> & Record<string, unknown>) {
    return taskReceipt(
      await this.client.post(apiPath("nodes", node, "lxc"), body),
      "lxc",
      node,
      body.vmid as number,
    );
  }
  @McpTool({
    name: "qemu_update",
    description: "Update QEMU configuration.",
    input: target.extend({
      name: z.string().min(1).optional(),
      memory: z.number().int().positive().optional(),
      cores: z.number().int().positive().optional(),
    }),
  })
  async qemuUpdate({
    node,
    vmid,
    ...body
  }: z.infer<typeof target> & Record<string, unknown>) {
    return taskReceipt(
      await this.client.put(
        apiPath("nodes", node, "qemu", vmid, "config"),
        body,
      ),
      "qemu",
      node,
      vmid,
    );
  }
  @McpTool({
    name: "lxc_update",
    description: "Update LXC configuration.",
    input: target.extend({
      hostname: z.string().min(1).optional(),
      memory: z.number().int().positive().optional(),
      cores: z.number().int().positive().optional(),
    }),
  })
  async lxcUpdate({
    node,
    vmid,
    ...body
  }: z.infer<typeof target> & Record<string, unknown>) {
    return taskReceipt(
      await this.client.put(
        apiPath("nodes", node, "lxc", vmid, "config"),
        body,
      ),
      "lxc",
      node,
      vmid,
    );
  }
  @McpTool({
    name: "qemu_resize_disk",
    description: "Resize a QEMU disk.",
    input: target.extend({ disk: z.string().min(1), size: z.string().min(2) }),
  })
  async qemuResize({
    node,
    vmid,
    ...body
  }: z.infer<typeof target> & Record<string, unknown>) {
    return taskReceipt(
      await this.client.put(
        apiPath("nodes", node, "qemu", vmid, "resize"),
        body,
      ),
      "qemu",
      node,
      vmid,
    );
  }
  @McpTool({
    name: "qemu_delete",
    description: "Permanently delete a QEMU VM; requires confirmation.",
    input: confirmation,
  })
  async qemuDelete(input: z.infer<typeof confirmation>) {
    return requireDestructiveConfirmation(
      { ...input, operation: "qemu-delete" },
      async () =>
        taskReceipt(
          await this.client.delete(
            apiPath("nodes", input.node, "qemu", input.vmid),
          ),
          "qemu",
          input.node,
          input.vmid,
        ),
    );
  }
  @McpTool({
    name: "lxc_delete",
    description: "Permanently delete an LXC container; requires confirmation.",
    input: confirmation,
  })
  async lxcDelete(input: z.infer<typeof confirmation>) {
    return requireDestructiveConfirmation(
      { ...input, operation: "lxc-delete" },
      async () =>
        taskReceipt(
          await this.client.delete(
            apiPath("nodes", input.node, "lxc", input.vmid),
          ),
          "lxc",
          input.node,
          input.vmid,
        ),
    );
  }
  @McpTool({
    name: "qemu_delete_disk",
    description:
      "Permanently delete an unused QEMU disk; requires confirmation.",
    input: confirmation.extend({ disk: z.string().min(1) }),
  })
  async qemuDeleteDisk(input: z.infer<typeof confirmation> & { disk: string }) {
    return requireDestructiveConfirmation(
      { ...input, operation: "qemu-disk-delete" },
      async () =>
        taskReceipt(
          await this.client.put(
            apiPath("nodes", input.node, "qemu", input.vmid, "unlink"),
            { idlist: input.disk },
          ),
          "qemu",
          input.node,
          input.vmid,
        ),
    );
  }
  @McpTool({
    name: "qemu_force_stop",
    description: "Force-stop a QEMU VM; requires confirmation.",
    input: confirmation,
  })
  async qemuForceStop(input: z.infer<typeof confirmation>) {
    return requireDestructiveConfirmation(
      { ...input, operation: "force-stop" },
      async () =>
        taskReceipt(
          await this.client.post(
            apiPath("nodes", input.node, "qemu", input.vmid, "status", "stop"),
            { forceStop: 1 },
          ),
          "qemu",
          input.node,
          input.vmid,
        ),
    );
  }
}
