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

  applyGithubReview(prId: string, reviewer: string, state: ReviewState): void {
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

  if (state.prs.length === 0) {
    prList.innerHTML = "<p>暂无 PR。</p>";
  } else {
    prList.innerHTML = state.prs
      .map((pr) => {
        const status = approvalState(pr);
        const reviewList = pr.reviews.length
          ? `<ul>${pr.reviews
              .map((r) => `<li><code>${r.reviewer}</code>: ${r.state} @ ${new Date(r.at).toLocaleString()}</li>`)
              .join("")}</ul>`
          : "<p>暂无审批</p>";

        return `
          <article class="card">
            <h3>${pr.title}</h3>
            <p>${pr.description}</p>
            <p><strong>审批状态:</strong> ${status}</p>
            <div class="row">
              <select data-kind="reviewer" data-id="${pr.id}">
                ${reviewers.map((r) => `<option value="${r}">${r}</option>`).join("")}
              </select>
              <button data-kind="approve" data-id="${pr.id}">Approve</button>
              <button data-kind="reject" data-id="${pr.id}">Request changes</button>
            </div>
            ${reviewList}
          </article>
        `;
      })
      .join("");
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

  cloud.applyGithubReview(prId, reviewerSelect.value, kind === "approve" ? "APPROVED" : "CHANGES_REQUESTED");
  render();
});

render();
