function showToast(message, duration = 3000){

  const toast = document.getElementById("toast");

  if(!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, duration);

}