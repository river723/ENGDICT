// src/components/SortPicker.tsx
//
// 共享排序选择器：一个显示当前排序的 Chip，点开后弹出竖排选项 Modal。
// 生词本 / 词库 / 从词库选词三处统一使用，避免各自复制 Modal + 样式。

import React, { useState, useCallback } from 'react';
import { TouchableOpacity, Modal } from 'react-native';
import { Chip, Text, Surface } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { makeStyles } from '../utils/useStyles';
import { useAppTheme } from '../theme/theme';

export interface SortOption<T extends string> {
  value: T;
  label: string;
}

interface SortPickerProps<T extends string> {
  options: SortOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export default function SortPicker<T extends string>({
  options,
  value,
  onChange,
}: SortPickerProps<T>) {
  const { colors } = useAppTheme();
  const styles = useStyles();
  const [visible, setVisible] = useState(false);

  const currentLabel =
    options.find((o) => o.value === value)?.label ?? options[0]?.label ?? '';

  const select = useCallback(
    (v: T) => {
      onChange(v);
      setVisible(false);
    },
    [onChange]
  );

  return (
    <>
      <Chip
        icon="sort"
        onPress={() => setVisible(true)}
        mode="flat"
        compact
        style={styles.sortChip}
      >
        {currentLabel}
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
            <Text style={styles.modalTitle}>排序方式</Text>
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
  sortChip: {
    height: 28,
    marginRight: 8,
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
