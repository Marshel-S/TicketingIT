if(sessionStorage.getItem("justLoggedIn")){

  setTimeout(()=>{
    showToast("Selamat datang di Dashboard",3000);
  },300);

  sessionStorage.removeItem("justLoggedIn");
}

fetch("/api/ticket-stats")
  .then(res => res.json())
  .then(data => {

    let assigned = data.assigned;
    let progress = data.in_progress;
    let review = data.in_review;
    let done = data.done;
    let revision = data.revision;

    let total = assigned + progress + review + done + revision;

    if (total === 0) total = 1;

    let assignedPercent = (assigned / total) * 100;
    let progressPercent = (progress / total) * 100;
    let reviewPercent = (review / total) * 100;
    let donePercent = (done / total) * 100;
    let revisionPercent = (revision / total) * 100;

    document.getElementById("assignedBar").style.width = assignedPercent + "%";
    document.getElementById("progressBar").style.width = progressPercent + "%";
    document.getElementById("reviewBar").style.width = reviewPercent + "%";
    document.getElementById("doneBar").style.width = donePercent + "%";
    document.getElementById("revisionBar").style.width = revisionPercent + "%";

// update text
document.getElementById("assignedText").innerText =
assigned + " Ticket (" + assignedPercent.toFixed(0) + "%)";

document.getElementById("progressText").innerText =
progress + " Ticket (" + progressPercent.toFixed(0) + "%)";

document.getElementById("reviewText").innerText =
review + " Ticket (" + reviewPercent.toFixed(0) + "%)";

document.getElementById("doneText").innerText =
done + " Ticket (" + donePercent.toFixed(0) + "%)";

document.getElementById("revisionText").innerText =
revision + " Ticket (" + revisionPercent.toFixed(0) + "%)";

});