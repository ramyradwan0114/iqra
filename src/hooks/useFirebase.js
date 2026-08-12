import { useState, useEffect, useCallback } from "react";
import {
  isFirebaseConfigured,
  saveStudent,
  getStudent,
  getAllStudents,
  deleteStudent,
  updateProgress,
} from "../utils/firebase.js";
import {
  listStudents,
  putStudent,
  removeStudent,
  getLocalProgress,
  setLocalProgress,
} from "../utils/db.js";

// ---------- كشف الاتصال ----------
// navigator.onLine بيكدب كتير (بيقول "متصل" وإنت على واي-فاي من غير إنترنت)
// فبنسمع للأحداث ونعامله كتلميح مش كحقيقة — أي عملية سحابية بتفشل
// بترجّع للمحلي على طول.
export function useOnlineStatus() {
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine !== false
  );
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);
  return online;
}

export function useCloudEnabled() {
  const online = useOnlineStatus();
  return isFirebaseConfigured() && online;
}

// ---------- مزامنة تقدّم طالب واحد ----------
export function useSyncProgress(studentId) {
  const cloud = useCloudEnabled();

  // بيكتب محليًا دايمًا (المصدر الموثوق)، وبيحاول السحابة كبونَس.
  // لو السحابة فشلت، بنعلّم السجل dirty عشان يتبعت في أول فرصة.
  const syncProgress = useCallback(
    async (progress, extra = {}) => {
      await setLocalProgress(progress, studentId || "local");
      if (!cloud || !studentId) return { synced: false };
      try {
        await updateProgress(studentId, progress, extra);
        return { synced: true };
      } catch {
        return { synced: false };
      }
    },
    [cloud, studentId]
  );

  const getStudentProgress = useCallback(async () => {
    if (cloud && studentId) {
      try {
        const remote = await getStudent(studentId);
        if (remote?.progress) {
          await setLocalProgress(remote.progress, studentId);
          return remote.progress;
        }
      } catch {}
    }
    return getLocalProgress(studentId || "local");
  }, [cloud, studentId]);

  return { syncProgress, getStudentProgress, cloud };
}

// ---------- قائمة الطلاب لوضع المعلّم ----------
// السحابة لو متاحة، وإلا المحلي. أي تعديل بيتكتب محليًا أولًا ثم يُدفع.
export function useStudents() {
  const cloud = useCloudEnabled();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState("local"); // local | cloud

  const refresh = useCallback(async () => {
    setLoading(true);
    let rows = null;
    if (cloud) {
      try {
        rows = await getAllStudents();
      } catch {
        rows = null;
      }
    }
    if (rows) {
      setSource("cloud");
      for (const r of rows) await putStudent({ ...r, dirty: false });
      setStudents(rows.sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0)));
    } else {
      setSource("local");
      setStudents(await listStudents());
    }
    setLoading(false);
  }, [cloud]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addStudent = useCallback(
    async (name, num) => {
      const id = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      const student = {
        id,
        number: num || "",
        name: (name || "").trim().slice(0, 40),
        progress: { child: [], adult: [] },
        scores: [],
        lastActive: Date.now(),
        dirty: true,
      };
      await putStudent(student);
      if (cloud) {
        try {
          await saveStudent(student);
          await putStudent({ ...student, dirty: false });
        } catch {}
      }
      await refresh();
      return student;
    },
    [cloud, refresh]
  );

  const resetStudentProgress = useCallback(
    async (id) => {
      const empty = { child: [], adult: [] };
      const row = (await listStudents()).find((s) => s.id === id);
      if (row) await putStudent({ ...row, progress: empty, scores: [], dirty: true });
      if (cloud) {
        try {
          await updateProgress(id, empty, { scores: [] });
        } catch {}
      }
      await refresh();
    },
    [cloud, refresh]
  );

  const deleteOne = useCallback(
    async (id) => {
      await removeStudent(id);
      if (cloud) {
        try {
          await deleteStudent(id);
        } catch {}
      }
      await refresh();
    },
    [cloud, refresh]
  );

  const resetAll = useCallback(async () => {
    const rows = await listStudents();
    for (const r of rows) {
      await putStudent({ ...r, progress: { child: [], adult: [] }, scores: [], dirty: true });
      if (cloud) {
        try {
          await updateProgress(r.id, { child: [], adult: [] }, { scores: [] });
        } catch {}
      }
    }
    await refresh();
  }, [cloud, refresh]);

  // دفع أي سجل لسه محليًا للسحابة لما النت يرجع
  useEffect(() => {
    if (!cloud) return;
    (async () => {
      const rows = await listStudents();
      const dirty = rows.filter((r) => r.dirty);
      if (!dirty.length) return;
      for (const r of dirty) {
        try {
          await saveStudent(r);
          await putStudent({ ...r, dirty: false });
        } catch {}
      }
      refresh();
    })();
  }, [cloud, refresh]);

  return {
    students,
    loading,
    source,
    cloudConfigured: isFirebaseConfigured(),
    refresh,
    addStudent,
    resetStudentProgress,
    deleteStudent: deleteOne,
    resetAll,
  };
}
