type ReviewState = "APPROVED" | "CHANGES_REQUESTED";

interface Review {
  reviewer: string;
  state: ReviewState;
  at: string;
}

interface PullRequest {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  reviews: Review[];
}

interface SSoTState {
  prs: PullRequest[];
}

class CloudStorageSSOT {
  private readonly key = "demo-cloud-ssot";

  load(): SSoTState {
    const raw = localStorage.getItem(this.key);
    if (!raw) return { prs: [] };
    try {
      const parsed = JSON.parse(raw) as SSoTState;
      if (!Array.isArray(parsed.prs)) return { prs: [] };
      return parsed;
    } catch {
      return { prs: [] };
    }
  }

  save(state: SSoTState): void {
    localStorage.setItem(this.key, JSON.stringify(state, null, 2));
  }

  createPr(title: string, description: string): void {
    const state = this.load();
    const pr: PullRequest = {
      id: crypto.randomUUID(),
      title,
      description,
      createdAt: new Date().toISOString(),
      reviews: []
    };
    state.prs.unshift(pr);
    this.save(state);
  }

  applyGitHubReview(prId: string, reviewer: string, state: ReviewState): void {
    const ssot = this.load();
    const pr = ssot.prs.find((item) => item.id === prId);
    if (!pr) return;

    pr.reviews = pr.reviews.filter((r) => r.reviewer !== reviewer);
    pr.reviews.push({ reviewer, state, at: new Date().toISOString() });

    this.save(ssot);
  }
}

const cloud = new CloudStorageSSOT();
const reviewers = ["alice", "bob", "carol"];

const titleInput = document.querySelector<HTMLInputElement>("#title")!;
const descInput = document.querySelector<HTMLTextAreaElement>("#desc")!;
const createButton = document.querySelector<HTMLButtonElement>("#create")!;
const prList = document.querySelector<HTMLDivElement>("#pr-list")!;
const snapshot = document.querySelector<HTMLPreElement>("#snapshot")!;

function approvalState(pr: PullRequest): "APPROVED" | "CHANGES_REQUESTED" | "PENDING" {
  if (pr.reviews.some((r) => r.state === "CHANGES_REQUESTED")) return "CHANGES_REQUESTED";
  const approvedBy = new Set(pr.reviews.filter((r) => r.state === "APPROVED").map((r) => r.reviewer));
  return reviewers.every((reviewer) => approvedBy.has(reviewer)) ? "APPROVED" : "PENDING";
}

function render(): void {
  const state = cloud.load();
  prList.replaceChildren();

  if (state.prs.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "暂无 PR。";
    prList.append(empty);
  } else {
    for (const pr of state.prs) {
      const status = approvalState(pr);
      const article = document.createElement("article");
      article.className = "card";

      const h3 = document.createElement("h3");
      h3.textContent = pr.title;
      article.append(h3);

      const desc = document.createElement("p");
      desc.textContent = pr.description;
      article.append(desc);

      const statusText = document.createElement("p");
      const label = document.createElement("strong");
      label.textContent = "审批状态:";
      statusText.append(label, ` ${status}`);
      article.append(statusText);

      const actionRow = document.createElement("div");
      actionRow.className = "row";

      const select = document.createElement("select");
      select.dataset.kind = "reviewer";
      select.dataset.id = pr.id;
      for (const reviewer of reviewers) {
        const option = document.createElement("option");
        option.value = reviewer;
        option.textContent = reviewer;
        select.append(option);
      }

      const approveBtn = document.createElement("button");
      approveBtn.dataset.kind = "approve";
      approveBtn.dataset.id = pr.id;
      approveBtn.textContent = "Approve";

      const rejectBtn = document.createElement("button");
      rejectBtn.dataset.kind = "reject";
      rejectBtn.dataset.id = pr.id;
      rejectBtn.textContent = "Request changes";

      actionRow.append(select, approveBtn, rejectBtn);
      article.append(actionRow);

      if (pr.reviews.length === 0) {
        const none = document.createElement("p");
        none.textContent = "暂无审批";
        article.append(none);
      } else {
        const ul = document.createElement("ul");
        for (const review of pr.reviews) {
          const li = document.createElement("li");
          const code = document.createElement("code");
          code.textContent = review.reviewer;
          li.append(code, `: ${review.state} @ ${new Date(review.at).toLocaleString()}`);
          ul.append(li);
        }
        article.append(ul);
      }

      prList.append(article);
    }
  }

  snapshot.textContent = JSON.stringify(state, null, 2);
}

createButton.addEventListener("click", () => {
  const title = titleInput.value.trim();
  const description = descInput.value.trim();
  if (!title) return;

  cloud.createPr(title, description);
  titleInput.value = "";
  descInput.value = "";
  render();
});

prList.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;

  const prId = target.dataset.id;
  const kind = target.dataset.kind;
  if (!prId || !kind) return;

  const reviewerSelect = prList.querySelector<HTMLSelectElement>(`select[data-kind='reviewer'][data-id='${prId}']`);
  if (!reviewerSelect) return;

  cloud.applyGitHubReview(prId, reviewerSelect.value, kind === "approve" ? "APPROVED" : "CHANGES_REQUESTED");
  render();
});

render();
