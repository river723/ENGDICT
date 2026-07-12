// src/hooks/usePersistedFilters.ts
//
// 记住某个页面的排序 / 筛选偏好：挂载时从存储加载上次选择，
// 之后每次变更立即写回。生词本 / 词库 / 从词库选词三处统一使用。
//
// 用法：
//   const [filters, setFilters] = usePersistedFilters('WordList', {
//     sortMode: 'recent', diffFilter: null, freqFilter: null,
//   });
//   const { sortMode, diffFilter, freqFilter } = filters;
//   // 变更：setFilters({ diffFilter: 3 })

import { useCallback, useEffect, useRef, useState } from 'react';
import StorageService from '../services/StorageService';

export function usePersistedFilters<T extends Record<string, any>>(
  screen: string,
  defaults: T
): [T, (patch: Partial<T>) => void, boolean] {
  const [state, setState] = useState<T>(defaults);
  const [loaded, setLoaded] = useState(false);

  // 始终指向最新 state，供 update 读取，避免闭包过期
  const stateRef = useRef(state);
  stateRef.current = state;

  // 挂载时加载上次保存的偏好（缺失的字段回退到默认值）
  useEffect(() => {
    let active = true;
    StorageService.getScreenFilters<T>(screen).then((saved) => {
      if (!active) return;
      if (saved && Object.keys(saved).length > 0) {
        setState((prev) => ({ ...prev, ...saved }));
      }
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [screen]);

  const update = useCallback(
    (patch: Partial<T>) => {
      const next = { ...stateRef.current, ...patch };
      stateRef.current = next;
      setState(next);
      // fire-and-forget：写存储失败不阻塞交互
      StorageService.saveScreenFilters(screen, next);
    },
    [screen]
  );

  return [state, update, loaded];
}
