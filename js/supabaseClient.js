// supabaseClient.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';


const supabaseUrl = 'https://xtjwyosalcdafdrpqotu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0and5b3NhbGNkYWZkcnBxb3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM0MDQwMzIsImV4cCI6MjA1ODk4MDAzMn0.o0hQJOq6Uy3POUwTMxiU5P-iofW7jbYYHAORnul73Js';

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
