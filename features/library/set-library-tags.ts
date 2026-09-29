"use server"

import { LIBRARY_TAGS, type LibraryTag } from "./library-tags"
import { createClient } from "@/lib/supabase/server"

type SetLibraryTagResult = {error?: string};

export async function setLibraryTag(workId: string, tag:LibraryTag | null,): Promise <SetLibraryTagResult> {
    const supabase = await createClient();
    const {data: authData} = await supabase.auth.getClaims();
    const userId = authData?.claims?.sub;

    if(!userId) return {error: "No autenticado"};

    const {data:existing} = await supabase
    .from("user_library")
    .select("id")
    .eq("user_id", userId)
    .eq("work_id", workId)
    .maybeSingle();

    if (tag === null) {
        if(!existing) return {};
        const {error} = await supabase.from("user_library").delete().eq("id", existing.id);
        return {error: error?.message};
    }

    const flags = Object.fromEntries(LIBRARY_TAGS.map((t)=>[t, t === tag])) as Record< LibraryTag, boolean>

     if (existing) {
        const { error } = await supabase.from("user_library").update(flags).eq("id", existing.id);
        return { error: error?.message };
    }

    const { error } = await supabase
        .from("user_library")
        .insert({ user_id: userId, work_id: workId, ...flags });
    return { error: error?.message };
}