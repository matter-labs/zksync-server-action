import * as core from "@actions/core";
import * as github from "@actions/github";
import { ActionError } from "../errors";
import type { ActionInputs, ResolvedRelease } from "../types";

const OWNER = "matter-labs";
const REPO = "zksync-os-server";

export async function resolveRelease(inputs: ActionInputs): Promise<ResolvedRelease> {
  let tag = inputs.version;

  if (inputs.version === "latest") {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "zksync-server-action",
      "X-GitHub-Api-Version": "2022-11-28",
    };

    const token = process.env.GITHUB_TOKEN;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    if (inputs.includePrerelease) {
      const response = await fetch(
        `${github.context.apiUrl}/repos/${OWNER}/${REPO}/releases?per_page=20`,
        { headers },
      );
      if (!response.ok) {
        throw new ActionError(
          `Failed to list releases for ${OWNER}/${REPO}: ${response.status} ${response.statusText}`,
        );
      }
      const releases = (await response.json()) as Array<{
        draft: boolean;
        tag_name: string;
      }>;
      const release = releases.find((candidate) => !candidate.draft);
      if (!release) {
        throw new ActionError(`No releases found for ${OWNER}/${REPO}`);
      }
      tag = release.tag_name;
    } else {
      const response = await fetch(
        `${github.context.apiUrl}/repos/${OWNER}/${REPO}/releases/latest`,
        { headers },
      );
      if (!response.ok) {
        throw new ActionError(
          `Failed to fetch latest release for ${OWNER}/${REPO}: ${response.status} ${response.statusText}`,
        );
      }
      const release = (await response.json()) as { tag_name: string };
      tag = release.tag_name;
    }
  }

  core.info(`Resolved zksync-os-server tag: ${tag}`);
  return {
    tag,
    baseUrl: `https://github.com/${OWNER}/${REPO}/releases/download/${tag}`,
  };
}
