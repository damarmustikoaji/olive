import { repositories } from "@/lib/repositories";
import { updateAgentDescription } from "./actions";
import type { AgentProfile, Task } from "@ai-workforce/core";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export default async function AgentsPage() {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - SEVEN_DAYS_MS);

  const [profiles, allTasks] = await Promise.all([
    repositories.agentProfiles.listAll(),
    repositories.tasks.listAll(200),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Agents</h1>
        <p className="text-sm text-neutral-500">
          Roster, tanggung jawab (bisa Anda edit langsung), dan performa nyata tiap AI agent.
        </p>
      </div>

      <div className="space-y-4">
        {profiles.map((profile) =>
          profile.status === "active" ? (
            <ActiveAgentCard key={profile.agentName} profile={profile} allTasks={allTasks} sevenDaysAgo={sevenDaysAgo} />
          ) : (
            <NotHiredCard key={profile.agentName} profile={profile} />
          ),
        )}
      </div>
    </div>
  );
}

async function ActiveAgentCard({
  profile,
  allTasks,
  sevenDaysAgo,
}: {
  profile: AgentProfile;
  allTasks: Task[];
  sevenDaysAgo: Date;
}) {
  if (profile.agentName === "workforce-manager") {
    const totalTriaged = allTasks.length;
    const escalated = allTasks.filter((t) => t.severity === "critical").length;
    const autoResolved = allTasks.filter((t) => t.status === "done").length;

    return (
      <AgentCard profile={profile}>
        <Stat label="Total task ditriase" value={totalTriaged} />
        <Stat label="Auto-resolved (non-critical)" value={autoResolved} color="text-green-400" />
        <Stat label="Eskalasi ke Owner (critical)" value={escalated} color="text-yellow-400" />
      </AgentCard>
    );
  }

  const myTasks = allTasks.filter((t) => t.assigneeAgent === profile.agentName);
  const myTasksThisWeek = myTasks.filter((t) => t.createdAt >= sevenDaysAgo);
  const doneThisWeek = myTasksThisWeek.filter((t) => t.status === "done").length;
  const pendingReview = myTasks.filter((t) => t.status === "ready_for_review").length;

  let piecesGenerated = 0;
  let piecesPublished = 0;
  for (const task of myTasks) {
    if (!task.contentBatchId) continue;
    const pieces = await repositories.contentPieces.listByBatch(task.contentBatchId);
    piecesGenerated += pieces.length;
    piecesPublished += pieces.filter((p) => p.publishedAt).length;
  }

  const usage = await repositories.aiInvocations.sumUsageByAgent(profile.agentName, sevenDaysAgo);

  return (
    <AgentCard profile={profile}>
      <Stat label="Task selesai (7 hari)" value={doneThisWeek} color="text-green-400" />
      <Stat label="Menunggu approval Owner" value={pendingReview} color="text-yellow-400" />
      <Stat label="Content piece dihasilkan" value={piecesGenerated} />
      <Stat label="Piece ter-publish" value={piecesPublished} />
      <Stat label="Token usage (7 hari)" value={usage.inputTokens + usage.outputTokens} />
    </AgentCard>
  );
}

function NotHiredCard({ profile }: { profile: AgentProfile }) {
  return (
    <div className="rounded border border-dashed border-neutral-800 p-4 opacity-60">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">
          {profile.role} <span className="text-xs text-neutral-500">— {profile.level}</span>
        </h2>
        <span className="rounded bg-neutral-800 px-2 py-0.5 text-xs text-neutral-400">Belum ada agent</span>
      </div>
      <p className="mt-2 whitespace-pre-line text-sm text-neutral-500">{profile.description}</p>
    </div>
  );
}

function AgentCard({ profile, children }: { profile: AgentProfile; children: React.ReactNode }) {
  return (
    <div className="rounded border border-neutral-800 p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">
          {profile.role} <span className="text-xs text-neutral-500">— {profile.level}</span>
        </h2>
        <span className="rounded bg-green-900 px-2 py-0.5 text-xs text-green-300">Active</span>
      </div>

      <form action={updateAgentDescription} className="mt-2 space-y-2">
        <input type="hidden" name="agentName" value={profile.agentName} />
        <textarea
          name="description"
          defaultValue={profile.description}
          rows={6}
          className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-300"
        />
        <button
          type="submit"
          className="rounded border border-neutral-700 px-3 py-1 text-sm text-neutral-300 hover:bg-neutral-900"
        >
          Simpan Job Description
        </button>
      </form>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-neutral-800 pt-4 md:grid-cols-3">{children}</div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div>
      <p className="text-xs text-neutral-500">{label}</p>
      <p className={`text-lg font-semibold ${color ?? ""}`}>{value}</p>
    </div>
  );
}
