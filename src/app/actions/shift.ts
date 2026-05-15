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

  let updateData: any = { Status: status };
  
  if (status === '調整済' && startTime && endTime) {
    // 現在のシフトを取得して、Original時間がまだ保存されていなければ保存する
    const { data: currentShift } = await supabaseAdmin
      .from('Shifts')
      .select('StartTime, EndTime, OriginalStartTime, OriginalEndTime')
      .eq('ShiftID', shiftId)
      .single();

    if (currentShift) {
      updateData.StartTime = startTime;
      updateData.EndTime = endTime;
      // すでにOriginalが設定されていなければ（初回調整時）、元の時間をOriginalに保存
      if (!currentShift.OriginalStartTime) {
        updateData.OriginalStartTime = currentShift.StartTime;
        updateData.OriginalEndTime = currentShift.EndTime;
      }
    }
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
