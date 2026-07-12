// src/components/FilterPicker.tsx
//
// 共享筛选选择器：一个显示当前筛选值的 Chip，点开后弹出竖排选项 Modal。
// 与 SortPicker 成对，用于难度 / 考频等「全部 + 1~5 级」的单选筛选，
// 避免在生词本 / 词库 / 从词库选词三处各自把 5 个 Chip 平铺占用整行。

import React, { useState, useCallback } from 'react';
import { TouchableOpacity, Modal } from 'react-native';
import { Chip, Text, Surface } from 'react-native-paper';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { makeStyles } from '../utils/useStyles';
import { useAppTheme } from '../theme/theme';

export interface FilterOption {
  value: number;
  label: string;
}

interface FilterPickerProps {
  // Chip 前缀与 Modal 标题，如「难度」「考频」
  label: string;
  options: FilterOption[];
  // null 表示「全部」
  value: number | null;
  onChange: (value: number | null) => void;
  allLabel?: string;
}

export default function FilterPicker({
  label,
  options,
  value,
  onChange,
  allLabel = '全部',
}: FilterPickerProps) {
  const { colors } = useAppTheme();
  const styles = useStyles();
  const [visible, setVisible] = useState(false);

  const active = value !== null;
  const currentLabel =
    value === null
      ? allLabel
      : options.find((o) => o.value === value)?.label ?? allLabel;

  const select = useCallback(
    (v: number | null) => {
      onChange(v);
      setVisible(false);
    },
    [onChange]
  );

  return (
    <>
      <Chip
        icon={() => (
          <MaterialCommunityIcons
            name="filter-variant"
            size={16}
            color={active ? colors.primary : colors.onSurfaceVariant}
          />
        )}
        onPress={() => setVisible(true)}
        mode={active ? 'flat' : 'outlined'}
        selected={active}
        showSelectedCheck={false}
        compact
        style={styles.filterChip}
        textStyle={styles.chipText}
      >
        {`${label}：${currentLabel}`}
      </Chip>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <Surface style={styles.modalContent}>
            <Text style={styles.modalTitle}>{label}</Text>

            <TouchableOpacity style={styles.option} onPress={() => select(null)}>
              <Text
                style={[
                  styles.optionText,
                  value === null && styles.optionTextActive,
                ]}
              >
                {allLabel}
              </Text>
              {value === null && (
                <MaterialIcons name="check" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>

            {options.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={styles.option}
                onPress={() => select(opt.value)}
              >
                <Text
                  style={[
                    styles.optionText,
                    value === opt.value && styles.optionTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
                {value === opt.value && (
                  <MaterialIcons name="check" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </Surface>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const useStyles = makeStyles((colors) => ({
  filterChip: {
    marginRight: 8,
  },
  chipText: {
    fontSize: 12,
    lineHeight: 16,
    marginVertical: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: 260,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.onSurface,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  optionText: {
    fontSize: 15,
    color: colors.onSurface,
  },
  optionTextActive: {
    color: colors.primary,
    fontWeight: 'bold',
  },
}));
