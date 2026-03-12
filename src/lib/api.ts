import { supabase } from './supabase';
import { formatSeconds } from './formatters';



/**
 * UTILITY: CONVERT TAIWAN TIME TO UTC
 * Use this before sending any manual punch (補打卡) to the backend.
 * input: '2026-03-07', '09:30:00'
 * output: '2026-03-07T01:30:00Z'
 */
export const convertTaiwanToUTC = (dateStr: string, timeStr: string) => {
  // Create a string that JS can parse as Taiwan time
  const localDateTime = `${dateStr}T${timeStr}+08:00`;
  const date = new Date(localDateTime);
  return date.toISOString(); // Returns UTC ISO string
};

/**
 * 1. ADD PUNCH (打卡 or 補打卡)
 * Handles both 上班 (Start) and 下班 (End).
 * isManual: true for 補打卡, false for real-time 打卡.
 */
export const addPunch = async (username: string, dateStr: string, timeStr: string, isManual: boolean = false) => {
  console.log(`[API] addPunch: username=${username}, date=${dateStr}, time=${timeStr}, isManual=${isManual}`);
  
  const utcTimestamp = convertTaiwanToUTC(dateStr, timeStr);
  console.log(`[API] addPunch payload:`, { username, created_at: utcTimestamp, is_manual: !!isManual });

  const { data, error } = await supabase
    .from('raw_punches')
    .insert([{ 
      username: username, 
      created_at: utcTimestamp, 
      is_manual: !!isManual 
    }]);

  if (error) throw error;
  return data;
};

/**
 * 2. GET DASHBOARD STATUS BY DATE
 * Fetch pre-calculated Taiwan Time strings and shortage from the View.
 */
export const fetchDashboardByDate = async (username: string, dateStr: string) => {
  const [dashboardRes, ptoRes] = await Promise.all([
    supabase.from('vw_punch_dashboard').select('*').eq('username', username).eq('punch_date', dateStr).maybeSingle(),
    supabase.from('user_pto').select('hours_off').eq('username', username).eq('pto_date', dateStr).maybeSingle()
  ]);

  if (dashboardRes.error) throw dashboardRes.error;

  const dashboardData = dashboardRes.data || { 
    username,
    punch_date: dateStr,
    start_display: "--:--:--", 
    end_display: "--:--:--", 
    shortage_display: "09:00:00",
    actual_seconds: 0 
  };

  dashboardData.hours_off = ptoRes.data?.hours_off || 0;
  return dashboardData;
};

/**
 * 3. GET MONTHLY HISTORY & TOTAL SHORTAGE
 * Used for the "歷史紀錄" page and the header statistics.
 */
export const fetchMonthlyHistory = async (username: string, monthYearStr: string) => {
  // monthYearStr format: '2026-03'
  const startDate = `${monthYearStr}-01`;
  
  const [yearStr, monthStr] = monthYearStr.split('-');
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10);
  
  month += 1;
  if (month > 12) {
    month = 1;
    year += 1;
  }
  const endDate = `${year}-${month.toString().padStart(2, '0')}-01`;

  const [historyRes, ptoRes, settingsRes] = await Promise.all([
    supabase.from('vw_punch_dashboard').select('*').eq('username', username).gte('punch_date', startDate).lt('punch_date', endDate).order('punch_date', { ascending: false }),
    supabase.from('user_pto').select('*').eq('username', username).gte('pto_date', startDate).lt('pto_date', endDate),
    supabase.from('user_settings').select('required_hours').eq('username', username).maybeSingle()
  ]);

  if (historyRes.error) throw historyRes.error;

  const validData = historyRes.data || [];
  const ptoData = ptoRes.data || [];
  const reqHours = settingsRes.data?.required_hours || 9;

  const ptoMap = new Map(ptoData.map(p => [p.pto_date, p.hours_off]));
  
  // Merge existing logs with PTO
  const logsWithPto = validData.map((row: any) => {
    const hoursOff = ptoMap.get(row.punch_date) || 0;
    ptoMap.delete(row.punch_date); // Mark as handled
    
    // The view target_seconds is already adjusted by PTO in the backend
    const targetSec = (row.target_seconds !== undefined && row.target_seconds !== null) ? row.target_seconds : (reqHours * 3600);
    const actualSec = row.actual_seconds || 0;
    const shortageSec = Math.max(0, targetSec - actualSec);

    return { 
      ...row, 
      hours_off: hoursOff,
      target_seconds: targetSec,
      shortage_display: formatSeconds(shortageSec)
    };
  });

  // Add missing PTO days (days where user took leave but didn't punch at all)
  ptoMap.forEach((hoursOff, date) => {
    const targetSec = (reqHours - hoursOff) * 3600;
    logsWithPto.push({
      username,
      punch_date: date,
      start_display: "--:--:--",
      end_display: "--:--:--",
      shortage_display: formatSeconds(Math.max(0, targetSec)),
      actual_seconds: 0,
      target_seconds: targetSec,
      hours_off: hoursOff
    });
  });

  // Re-sort by date descending
  logsWithPto.sort((a, b) => b.punch_date.localeCompare(a.punch_date));

  // Calculate Total Accumulated Shortage for the Month
  const totalActual = logsWithPto.reduce((acc: number, row: any) => acc + (row.actual_seconds || 0), 0);
  const totalTarget = logsWithPto.reduce((acc: number, row: any) => acc + (row.target_seconds || 0), 0);
  const totalShortageSec = Math.max(0, totalTarget - totalActual);
  
  return {
    logs: logsWithPto,
    totalShortage: formatSeconds(totalShortageSec),
    daysWorked: logsWithPto.length
  };
};

/**
 * 4. LOG PTO / LEAVE (Hourly Units)
 * Directly reduces the 9-hour requirement for that specific date.
 */
export const logLeaveHours = async (username: string, dateStr: string, hours: number) => {
  const { data, error } = await supabase
    .from('user_pto')
    .upsert({ 
      username: username, 
      pto_date: dateStr, 
      hours_off: hours 
    }, { onConflict: 'username, pto_date' });

  if (error) throw error;
  return data;
};

/**
 * 4b. FETCH ALL PTO RECORDS
 */
export const fetchUserPto = async (username: string) => {
  const { data, error } = await supabase
    .from('user_pto')
    .select('*')
    .eq('username', username)
    .order('pto_date', { ascending: false });

  if (error) throw error;
  return data || [];
};

/**
 * 4c. DELETE PTO RECORD
 */
export const deletePtoRecord = async (username: string, pto_date: string) => {
  const { error } = await supabase
    .from('user_pto')
    .delete()
    .eq('username', username)
    .eq('pto_date', pto_date);

  if (error) throw error;
  return true;
};

/**
 * 5. UPDATE USER WORK SCHEDULE (The 4 Shifts)
 * scheduleKey: '0900', '0930', '1000', or '1300'
 */
export const updateShiftSettings = async (username: string, scheduleKey: '0900' | '0930' | '1000' | '1300') => {
  const schedules = {
    '0900': { start: '09:00:00', end: '18:00:00' },
    '0930': { start: '09:30:00', end: '18:30:00' },
    '1000': { start: '10:00:00', end: '19:00:00' },
    '1300': { start: '13:00:00', end: '22:00:00' }
  };

  const selected = schedules[scheduleKey];

  const { data, error } = await supabase
    .from('user_settings')
    .upsert({
      username: username,
      shift_start: selected.start,
      shift_end: selected.end,
      required_hours: 9
    });

  if (error) throw error;
  return data;
};

export const fetchUserSettings = async (username: string) => {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('username', username)
    .maybeSingle();

  if (error) throw error;
  return data;
};

/**
 * 6. DELETE DAILY RECORD
 * Fully clears a day's summary and associated logs.
 */
export const deleteDailyRecord = async (username: string, dateStr: string) => {
  // 1. Delete the summary table to prevent Unique Constraint crashes on re-punch
  const { error: summaryError } = await supabase
    .from('daily_summary')
    .delete()
    .eq('username', username)
    .eq('punch_date', dateStr);

  if (summaryError) {
    console.error("Failed to delete daily_summary, ignoring as it might not heavily impact:", summaryError);
  }

  // 2. Clear out all raw punches for the local date boundary
  const startUTC = convertTaiwanToUTC(dateStr, '00:00:00');
  const endUTC = convertTaiwanToUTC(dateStr, '23:59:59');

  const { error: rawError } = await supabase
    .from('raw_punches')
    .delete()
    .eq('username', username)
    .gte('created_at', startUTC)
    .lt('created_at', endUTC);

  if (rawError) throw rawError;

  // 3. Delete PTO records for that day to be completely thorough
  await supabase
    .from('user_pto')
    .delete()
    .eq('username', username)
    .eq('pto_date', dateStr);

  return true;
};

/**
 * 7. FETCH RAW PUNCHES (For "Manage Punch" feature)
 */
export const fetchRawPunchesByDate = async (username: string, dateStr: string) => {
  // Query from 00:00:00 Taiwan time to 23:59:59 Taiwan time
  const startUTC = convertTaiwanToUTC(dateStr, '00:00:00');
  const endUTC = convertTaiwanToUTC(dateStr, '23:59:59');

  const { data, error } = await supabase
    .from('raw_punches')
    .select('*')
    .eq('username', username)
    .gte('created_at', startUTC)
    .lt('created_at', endUTC)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

/**
 * 8. DELETE SPECIFIC PUNCH
 */
export const deleteSpecificPunch = async (id: number) => {
  const { error } = await supabase
    .from('raw_punches')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
};
