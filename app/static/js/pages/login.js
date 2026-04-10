const SUPABASE_URL = document.currentScript.getAttribute('data-supabase-url');
const SUPABASE_ANON_KEY = document.currentScript.getAttribute('data-supabase-anon-key');

window.__sb__ = window.__sb__ || window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const sb = window.__sb__;

const msg = document.getElementById("msg");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginForm = document.getElementById("loginForm");
const submitBtn = loginForm?.querySelector('button[type="submit"]');
const googleBtn = document.getElementById("googleBtn");

// Error elements
const emailError = document.getElementById("emailError");
const passwordError = document.getElementById("passwordError");
const generalError = document.getElementById("generalError");

function clearErrors() {
  if (emailError) emailError.textContent = "";
  if (passwordError) passwordError.textContent = "";
  if (generalError) generalError.textContent = "";
}

function validateForm(email, password) {
  clearErrors();
  let isValid = true;

  // Email validation
  if (!email) {
    if (emailError) emailError.textContent = "Email is required";
    isValid = false;
  } else if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    if (emailError) emailError.textContent = "Please enter a valid email address";
    isValid = false;
  }

  // Password validation
  if (!password) {
    if (passwordError) passwordError.textContent = "Password is required";
    isValid = false;
  } else if (password.length < 1) {
    if (passwordError) passwordError.textContent = "Password is required";
    isValid = false;
  }

  return isValid;
}

async function postTokenToFlask(access_token) {
  console.log("Posting token to Flask:", access_token ? "Token exists" : "No token");

  const res = await fetch("/auth/callback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ access_token }),
  });

  const json = await res.json();
  console.log("Auth callback response:", json);

  if (!json.ok) {
    if (generalError) generalError.textContent = "Server auth failed: " + (json.error || "unknown error");
    throw new Error(json.error || "Auth callback failed");
  }
}

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors();
    if (msg) msg.textContent = "Signing in…";

    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    // Validate form
    if (!validateForm(email, password)) {
      return;
    }

    // Disable submit button
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Signing in…";
    }

    console.log("Attempting Supabase login for:", email);

    try {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });

      console.log("Supabase response:", data, error);

      if (error) {
        console.log("Supabase error:", error.message);
        
        // Route error to appropriate field
        if (error.message.includes("email")) {
          if (emailError) emailError.textContent = error.message;
        } else if (error.message.includes("password")) {
          if (passwordError) passwordError.textContent = error.message;
        } else if (error.message.includes("Invalid")) {
          if (generalError) generalError.textContent = "Email or password is incorrect";
        } else {
          if (generalError) generalError.textContent = error.message;
        }
        
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Sign in";
        }
        return;
      }

      if (!data.session) {
        if (generalError) generalError.textContent = "No session returned.";
        console.log("No session returned!");
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Sign in";
        }
        return;
      }

      await postTokenToFlask(data.session.access_token);

      console.log("Redirecting to discover…");
      window.location.href = "/discover";
    } catch (error) {
      console.error("Login error:", error);
      if (generalError) generalError.textContent = "Network error: " + error.message;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Sign in";
      }
    }
  });
}

if (googleBtn) {
  googleBtn.addEventListener("click", async () => {
    if (msg) msg.textContent = "Redirecting to Google…";

    try {
      await sb.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + "/auth/callback",
        },
      });
    } catch (error) {
      console.error("Google OAuth error:", error);
      if (generalError) generalError.textContent = "Error: " + error.message;
    }
  });
}
