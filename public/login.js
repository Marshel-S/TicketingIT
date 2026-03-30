document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    alert("Email dan Password wajib diisi!");
    return;
  }

  try {
    const response = await fetch("/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password }),
      credentials: "same-origin"
    });

    const data = await response.json();

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const errorText = document.getElementById("loginError");

if (data.success) {

  emailInput.classList.remove("error-input");
  passwordInput.classList.remove("error-input");
  errorText.innerText = "";

  window.location.href = "/dashboard";

} else {

  emailInput.classList.add("error-input");
  passwordInput.classList.add("error-input");
  errorText.innerText = "Wrong identifier or password";

}

  } catch (error) {
    console.error("Login error:", error);
    alert("Terjadi kesalahan pada server.");
  }
});

function loginSuccess(){

  showToast("Login berhasil!", 800);

  sessionStorage.setItem("justLoggedIn","true");

  setTimeout(()=>{
    window.location.href = "/dashboard";
  },900);

}