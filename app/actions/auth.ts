"use server";

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function signUp(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("fullName") as string;
  const role = formData.get("role") as string || 'customer';

  // Create user in Supabase auth
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: role,
      }
    }
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.user) {
    return { error: 'Failed to create user' };
  }

  // Do not write to DB until location is completed
  return {
    user: {
      id: data.user.id,
      email,
      full_name: fullName,
      password, // store plain password for later sign in
      role,
    },
  };
}

export async function signIn(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  return { user: data.user };
}

export async function completeSignup(formData: FormData) {
  const userId = formData.get("userId") as string;
  const email = formData.get("email") as string;
  const fullName = formData.get("fullName") as string;
  const role = (formData.get("role") as string) || 'customer';
  const province = formData.get("province") as string;
  const municipality = formData.get("municipality") as string;
  const barangay = formData.get("barangay") as string;
  const streetAddress = formData.get("streetAddress") as string;
  const landmarks = formData.get("landmarks") as string;

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      email,
      full_name: fullName,
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
