import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

interface DataColumn<T> {
  key: string;
  title: string;
  flex?: number;
  render: (item: T) => React.ReactNode;
}

interface DataTableProps<T extends { id: number | string }> {
  data: T[];
  columns: DataColumn<T>[];
  emptyText?: string;
}

export default function DataTable<T extends { id: number | string }>({ data, columns, emptyText }: DataTableProps<T>) {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        {columns.map((column) => (
          <Text key={column.key} style={[styles.headerText, { flex: column.flex || 1 }]}> 
            {column.title}
          </Text>
        ))}
      </View>

      <FlatList
        data={data}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={<Text style={styles.empty}>{emptyText || 'Sin registros'}</Text>}
        renderItem={({ item }) => (
          <View style={styles.bodyRow}>
            {columns.map((column) => (
              <View key={column.key} style={{ flex: column.flex || 1 }}>
                {column.render(item)}
              </View>
            ))}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: '#e0e6ef',
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#f0f4fa',
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  headerText: {
    fontWeight: '700',
    color: '#25364a',
    fontSize: 12,
  },
  bodyRow: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#edf1f7',
    alignItems: 'center',
    gap: 6,
  },
  empty: {
    textAlign: 'center',
    color: '#66768a',
    paddingVertical: 20,
  },
});
