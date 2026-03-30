let userRole = null;

const params = new URLSearchParams(window.location.search);
const id = params.get("id");

async function getSession() {
  const res = await fetch("/api/session");
  const data = await res.json();

  if (data.loggedIn) {
    userRole = data.role;
  }
}

function getNextFlow(status) {
  const flow = {
    "unassigned": "Assigned",
    "assigned": "In Progress",
    "in progress": "In Review",
    "in review": "Done"
  };
  return flow[status] || null;
}

function isAllowed(role, currentStatus, nextStatus) {

  if (role === "admin") return true;

  if (role === "technical") {
    return (
      (currentStatus === "assigned" && nextStatus === "In Progress") ||
      (currentStatus === "in progress" && nextStatus === "In Review")
    );
  }

  if (role === "user") {
    return currentStatus === "in review" && nextStatus === "Done";
  }

  return false;
}

function updateStatusColor(status, el) {
  el.className = "value status";

  switch (status.toLowerCase()) {
    case "unassigned":
      el.classList.add("unassigned");
      break;
    case "assigned":
      el.classList.add("assigned");
      break;
    case "in progress":
      el.classList.add("in-progress");
      break;
    case "in review":
      el.classList.add("in-review");
      break;
    case "done":
      el.classList.add("done");
      break;
  }
}

/* =========================
   🔥 TAMBAHAN ASSIGN MODAL
========================= */

function createAssignModal() {
  const modal = document.createElement("div");
  modal.classList.add("modal");

  modal.innerHTML = `
    <div class="modal-content">
      <h3>Assign Ticket</h3>

      <select id="technicalSelect">
        <option value="">Choose Technician</option>
      </select>

      <div style="margin-top:15px;">
        <button id="confirmAssign">Assign</button>
        <button id="closeModal">Cancel</button>
      </div>

      <p id="modal-warn">Make sure you choose based on competency *<p>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector("#closeModal").onclick = () => modal.remove();

  return modal;
}

async function loadTechnicalOptions(select) {
  const res = await fetch("/technical-users");
  const data = await res.json();

  console.log("DATA TECH:", data);

  select.innerHTML = '<option value="">Choose Technician</option>';

  data.forEach(user => {
    const option = document.createElement("option");
    option.value = user.id;
    option.textContent = user.email;
    select.appendChild(option);
  });
}

async function assignTicket(ticketId, assigned_to) {
  await fetch("/assign-ticket", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      ticket_id: ticketId,
      assigned_to
    })
  });
}

/* ========================= */

async function loadDetails() {
  try {
    const res = await fetch(`/api/tickets/${id}`);
    const data = await res.json();

    const container = document.getElementById("details");
    const currentStatus = data.status.toLowerCase();
    const nextStatus = getNextFlow(currentStatus);

    container.innerHTML = `
      <h2>Ticket Details</h2>

      <div class="details-grid">

        <div class="field">
          <label>ID</label>
          <div class="value">${data.id}</div>
        </div>

        <div class="field">
          <label>Requester</label>
          <div class="value">${data.requester}</div>
        </div>

        <div class="field">
          <label>Email</label>
          <div class="value">${data.email}</div>
        </div>

        <div class="field">
          <label>Attachment</label>
          <div class="value">
            ${
              data.attachment
                ? `<a href="/uploads/${data.attachment}" target="_blank" class="attachment-link">
                     ${data.attachment.split('/').pop()}
                   </a>`
                : "-"
            }
          </div>
        </div>

        <div class="field">
          <label>Message</label>
          <div class="value message-box">${data.message}</div>
        </div>

        <div class="field">
          <label>Priority</label>
          <div class="value">${data.priority}</div>
        </div>

        <div class="field">
          <label>Status</label>
          <div class="status-wrapper">
            <div class="value status ${currentStatus}" id="status">
              ${data.status}
            </div>

            <div class="action-buttons" style="margin-top:20px;">
              <button id="nextBtn">Next</button>
              <button id="backBtn">Back</button>
            </div>
          </div>
        </div>

      </div>
    `;

    const statusEl = document.getElementById("status");
    const nextBtn = document.getElementById("nextBtn");
    const backBtn = document.getElementById("backBtn");

    updateStatusColor(data.status, statusEl);

    backBtn.addEventListener("click", () => {
      window.location.href = "/ticket";
    });

    /* =========================
       🔥 LOGIC ASSIGN (ADMIN)
    ========================= */

  async function assignTicket(id, technicalId) {
  const res = await fetch(`/api/tickets/${id}/assign`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      technicalId: parseInt(technicalId)
    })
  });

  const data = await res.json();
  console.log("ASSIGN RESPONSE:", data);

  if (!res.ok) {
    throw new Error(data.message || "Assign gagal");
  }

  return data;
}  

    if (userRole === "admin" && currentStatus === "unassigned") {
  nextBtn.innerText = "Assign";

  nextBtn.onclick = async () => {
    const modal = createAssignModal();
    const select = modal.querySelector("#technicalSelect");

    await loadTechnicalOptions(select);

    modal.querySelector("#confirmAssign").onclick = async () => {
      const assigned_to = select.value;

      console.log("ASSIGNED TO:", assigned_to);

      if (!assigned_to) {
        alert("Pilih technical dulu!");
        return;
      }

      try {
        await assignTicket(id, assigned_to);

        alert("Ticket has Assigned successfully");
        modal.remove();
        window.location.href = "/ticket";

      } catch (err) {
        alert("Gagal assign: " + err.message);
      }
    };
  };

  return;
}

    /* ========================= */

    if (!nextStatus) {
      nextBtn.style.display = "none";
      return;
    }

    if (!isAllowed(userRole, currentStatus, nextStatus)) {
      nextBtn.style.display = "none";
      return;
    }

    nextBtn.innerText = nextStatus;

    nextBtn.addEventListener("click", async () => {

      try {
        const res = await fetch(`/api/tickets/${id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextStatus })
        });

        const result = await res.json();

        alert(result.message);

        window.location.href = "/ticket";

      } catch (err) {
        console.error(err);
        alert("Gagal mengubah status");
      }

    });

  } catch (err) {
    console.error(err);
    alert("Gagal memuat detail ticket");
  }
}

(async () => {
  await getSession();
  loadDetails();
})();