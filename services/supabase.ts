
import { createClient } from '@supabase/supabase-js';
import { Expense, PaymentMethod, ProfileType, AppNotification } from '../types';

const SUPABASE_URL = 'https://jpcweqcqysxgzycftzyv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwY3dlcWNxeXN4Z3p5Y2Z0enl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NzEwMDYsImV4cCI6MjA4NjI0NzAwNn0.nMiOuiPYiz_wIdaS7j-ONA_RZ8MNs2_g7RfQrZ339dM';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwY3dlcWNxeXN4Z3p5Y2Z0enl2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDY3MTAwNiwiZXhwIjoyMDg2MjQ3MDA2fQ.xkIPrLb3h4hvFk41LiA5xij0DmD_mGm0jnTh1IViJZY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storageKey: 'sb-admin-auth'
  }
});

const PACK_SEP = ' |#| ';

const packDescription = (desc: string, pm: PaymentMethod, isSub: boolean, profile: ProfileType, isExtra: boolean, extraType: string) => {
  return `${desc}${PACK_SEP}${pm}${PACK_SEP}${isSub}${PACK_SEP}${profile}${PACK_SEP}${isExtra}${PACK_SEP}${extraType}`;
};

const unpackDescription = (packedStr: string) => {
  if (!packedStr || !packedStr.includes(PACK_SEP)) {
    return { 
      desc: packedStr, 
      pm: PaymentMethod.Contanti, 
      isSub: false, 
      profile: 'personal' as ProfileType,
      isExtra: false,
      extraType: 'given' as 'given' | 'received'
    };
  }
  const parts = packedStr.split(PACK_SEP);
  return {
    desc: parts[0],
    pm: (parts[1] as PaymentMethod) || PaymentMethod.Contanti,
    isSub: parts[2] === 'true',
    profile: (parts[3] as ProfileType) || 'personal',
    isExtra: parts[4] === 'true',
    extraType: (parts[5] as 'given' | 'received') || 'given'
  };
};

export const auth = {
  async signUp(email: string, password: string, username: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: username }, emailRedirectTo: window.location.origin }
    });
    if (error) throw error;
    if (data.user) {
        try {
            await db.upsertProfile(data.user.id, email, username);
        } catch (e) {
            console.error("Errore creazione profilo:", e);
        }
    }
    return data;
  },
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },
  async updateProfile(name: string) {
    const { data, error } = await supabase.auth.updateUser({ data: { display_name: name } });
    if (error) throw error;
    if (data.user) {
        await db.upsertProfile(data.user.id, data.user.email || '', name);
    }
    return data;
  },
  async updateEmail(newEmail: string) {
    const { data, error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) throw error;
    return data;
  },
  async updatePassword(password: string) {
    const { data, error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    return data;
  },
  async deleteAccount() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await db.clearAll(user.id);
      await supabase.from('profiles').delete().eq('id', user.id);
      await this.signOut();
    }
  },
  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) throw error;
  },
  async resendConfirmation(email: string) {
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) throw error;
  }
};

export const db = {
  async upsertProfile(id: string, email: string, name: string) {
    const role = email === 'admin@mintflow.com' ? 'admin' : 'user';
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ 
        id, 
        email, 
        display_name: name,
        role,
        last_login: new Date().toISOString() 
      }, { onConflict: 'id' })
      .select();
    if (error) throw error;
    return data;
  },

  async getAllProfiles() {
    const { data, error } = await supabase.from('profiles').select('*').order('email');
    if (error) throw error;
    return data || [];
  },

  async updateUserStatus(id: string, status: 'active' | 'disabled') {
    const { data, error } = await supabase.from('profiles').update({ status }).eq('id', id).select();
    if (error) throw error;
    return data;
  },

  // NOTIFICHE
  async sendNotification(userId: string, title: string, message: string) {
    const { error } = await supabaseAdmin.from('notifications').insert([{
      user_id: userId,
      title,
      message,
      is_read: false
    }]);
    if (error) throw error;
  },

  async getNotifications(userId: string): Promise<AppNotification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async markNotificationRead(notificationId: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
    if (error) throw error;
  },

  // SPESE
  async getExpenses(userId: string): Promise<Expense[]> {
    const { data, error } = await supabase.from('expenses').select('*').eq('user_id', userId).order('date', { ascending: false });
    if (error) throw error;
    return (data || []).map((e: any) => {
      const unpacked = unpackDescription(e.description);
      return {
        id: e.id,
        amount: e.amount,
        category: e.category,
        date: e.date,
        description: unpacked.desc,
        paymentMethod: unpacked.pm,
        isSubscription: unpacked.isSub,
        profile: unpacked.profile,
        isExtra: unpacked.isExtra,
        extraType: unpacked.extraType
      };
    });
  },

  async addExpense(expense: Omit<Expense, 'id'>, userId: string): Promise<Expense> {
    const packedDesc = packDescription(expense.description, expense.paymentMethod, !!expense.isSubscription, expense.profile || 'personal', !!expense.isExtra, expense.extraType || 'given');
    const { data, error } = await supabase.from('expenses').insert([{
      description: packedDesc,
      amount: expense.amount,
      category: expense.category,
      date: expense.date,
      user_id: userId
    }]).select().single();
    if (error) throw error;
    return { id: data.id, ...expense };
  },

  async updateExpense(id: string, expense: Partial<Omit<Expense, 'id'>>): Promise<Expense> {
    const { data: current } = await supabase.from('expenses').select('description').eq('id', id).single();
    const currentUnpacked = unpackDescription(current?.description || '');
    const newDesc = expense.description !== undefined ? expense.description : currentUnpacked.desc;
    const newPM = expense.paymentMethod !== undefined ? expense.paymentMethod : currentUnpacked.pm;
    const newIsSub = expense.isSubscription !== undefined ? expense.isSubscription : currentUnpacked.isSub;
    const newProfile = expense.profile !== undefined ? expense.profile : currentUnpacked.profile;
    const newIsExtra = expense.isExtra !== undefined ? expense.isExtra : currentUnpacked.isExtra;
    const newExtraType = expense.extraType !== undefined ? expense.extraType : currentUnpacked.extraType;

    const { data, error } = await supabase.from('expenses').update({
      description: packDescription(newDesc, newPM, newIsSub, newProfile, newIsExtra, newExtraType),
      amount: expense.amount,
      category: expense.category,
      date: expense.date
    }).eq('id', id).select().single();
    if (error) throw error;
    const unpacked = unpackDescription(data.description);
    return { id: data.id, ...data, ...unpacked, description: unpacked.desc, paymentMethod: unpacked.pm, isSubscription: unpacked.isSub };
  },

  async deleteExpense(id: string) {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) throw error;
  },

  async clearAll(userId: string) {
    const { error } = await supabase.from('expenses').delete().eq('user_id', userId);
    if (error) throw error;
  }
};
