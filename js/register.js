// register.js
import supabase from "./supabaseClient.js";

// Function to handle user registration
window.registerUser = async function() {
  const signupButton = document.getElementById("signup-button");
  signupButton.disabled = true;
  
  const email = document.getElementById("register-email").value.trim();
  const username = document.getElementById("register-username").value.trim();
  const password = document.getElementById("register-password").value.trim();
  const confirmPassword = document.getElementById("register-confirm-password").value.trim();
  const profilePictureFile = document.getElementById("profile-picture").files[0];
  
  if (!email || !username || !password || !confirmPassword) {
    alert("Please fill in all fields.");
    signupButton.disabled = false;
    return;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    alert("Please enter a valid email address.");
    signupButton.disabled = false;
    return;
  }
  
  if (password !== confirmPassword) {
    alert("Passwords do not match!");
    signupButton.disabled = false;
    return;
  }
  
  const originalButtonText = signupButton.textContent;
  signupButton.textContent = "Registering...";
  
  try {
    let profilePictureURL = "";
    
    // If a profile picture was selected, upload it to Supabase Storage
    if (profilePictureFile) {
      // Generate a unique file path (using timestamp here; you could also use a UUID)
      const filePath = `profilePictures/${Date.now()}_${profilePictureFile.name}`;
      
      // Upload the file
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(filePath, profilePictureFile);
      
      if (uploadError) {
        throw uploadError;
      }
      
      // Log the upload data for debugging
      console.log("Upload data:", uploadData);
      
      // Attempt to get the public URL for the uploaded file
      const { data: publicUrlData, error: publicUrlError } = await supabase.storage
        .from('profile-pictures')
        .getPublicUrl(filePath);
      
      console.log("Public URL response:", publicUrlData);
      
      if (publicUrlData && publicUrlData.publicUrl) {
        profilePictureURL = publicUrlData.publicUrl;
      } else {
        // Fallback: Generate a signed URL valid for 1 hour
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from('profile-pictures')
          .createSignedUrl(filePath, 3600);
        console.log("Signed URL response:", signedUrlData);
        if (signedUrlData && signedUrlData.signedUrl) {
          profilePictureURL = signedUrlData.signedUrl;
        } else {
          profilePictureURL = "";
        }
      }
    }
    
    // Sign up the user with email, password, and additional metadata
    const { data: { user, session }, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          username: username,
          profilePicture: profilePictureURL
        }
      }
    });
    
    if (error) {
      throw error;
    }
    
    // Insert user record into custom "users" table
    if (user) {
      const { error: insertError } = await supabase
        .from('users')
        .insert([
          {
            id: user.id,
            username: username,
            profilePicture: profilePictureURL, // Ensure column name matches your DB schema
            email: email,
            created_at: new Date()
          }
        ]);
      if (insertError) {
        throw insertError;
      }
    }
    
    alert("Registration successful! Please check your email to verify your account.");
    window.location.href = "index.html";
  } catch (error) {
    console.error("Error during registration:", error);
    alert("Registration failed: " + error.message);
  } finally {
    signupButton.disabled = false;
    signupButton.textContent = originalButtonText;
  }
};