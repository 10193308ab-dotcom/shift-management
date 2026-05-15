'use server';

import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function updateShiftStatus(
  shiftId: string, 
  status: '承認済' | '却下' | '調整済', 
  startTime?: string, 
  endTime?: string
) {
  if (!shiftId || !status) {
    return { error: '必要な情報が不足しています' };
  }

  const updateData: any = { Status: status };
  
  if (status === '調整済' && startTime && endTime) {
    updateData.StartTime = startTime;
    updateData.EndTime = endTime;
  }

  const { error } = await supabaseAdmin
    .from('Shifts')
    .update(updateData)
    .eq('ShiftID', shiftId);

  if (error) {
    return { error: 'シフトの更新に失敗しました: ' + error.message };
  }

  return { success: true };
}
