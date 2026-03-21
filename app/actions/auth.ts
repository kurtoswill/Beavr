"use server";

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from 'bcryptjs';

export async function signUp(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("fullName") as string;
  const role = formData.get("role") as string || 'customer';

  // Hash the password
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  const userId = crypto.randomUUID();

  // Check duplicate email early
  const { data: existingProfile, error: checkError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single();

  if (checkError && checkError.code !== 'PGRST116') {
    return { error: `Unable to check email: ${checkError.message}` };
  }

  if (existingProfile) {
    return { error: 'A user with this email already exists' };
  }

  // Do not write to DB until location is completed
  return {
    user: {
      id: userId,
      email,
      full_name: fullName,
      password_hash: hashedPassword,
      role,
    },
  };
}

export async function signIn(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // Query profiles
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !data) {
    return { error: 'Invalid email or password' };
  }

  // Check password
  const isValid = await bcrypt.compare(password, data.password_hash);
  if (!isValid) {
    return { error: 'Invalid email or password' };
  }

  return { user: data };
}

export async function completeSignup(formData: FormData) {
  const userId = formData.get("userId") as string;
  const email = formData.get("email") as string;
  const fullName = formData.get("fullName") as string;
  const passwordHash = formData.get("passwordHash") as string;
  const role = (formData.get("role") as string) || 'customer';
  const province = formData.get("province") as string;
  const municipality = formData.get("municipality") as string;
  const barangay = formData.get("barangay") as string;
  const streetAddress = formData.get("streetAddress") as string;
  const landmarks = formData.get("landmarks") as string;

  // Double-check duplicate email before write (race-safe)
  const { data: existing, error: existingErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single();

  if (existingErr && existingErr.code !== 'PGRST116') {
    return { error: `Unable to check email: ${existingErr.message}` };
  }

  if (existing) {
    return { error: 'A user with this email already exists' };
  }

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      email,
      full_name: fullName,
      password_hash: passwordHash,
      role,
      province,
      municipality,
      barangay,
      street_address: streetAddress,
      landmarks,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  return { user: data };
}

export async function updateLocation(formData: FormData) {
  const userId = formData.get("userId") as string;
  const province = formData.get("province") as string;
  const municipality = formData.get("municipality") as string;
  const barangay = formData.get("barangay") as string;
  const streetAddress = formData.get("streetAddress") as string;
  const landmarks = formData.get("landmarks") as string;

  const { error } = await supabase
    .from('profiles')
    .update({
      province,
      municipality,
      barangay,
      street_address: streetAddress,
      landmarks
    })
    .eq('id', userId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  redirect('/');
}
