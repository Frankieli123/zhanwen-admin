import React from "react";
import {
  List,
  useTable,
  EditButton,
  ShowButton,
  DeleteButton,
  DateField,
  TagField,
} from "@refinedev/antd";
import { Table, Space, Tag } from "antd";
import type { IResourceComponentsProps } from "@refinedev/core";

export const HexagramList: React.FC<IResourceComponentsProps> = () => {
  const { tableProps } = useTable({
    syncWithLocation: true,
  });

  const elementColors = {
    wood: "green",
    fire: "red", 
    earth: "orange",
    metal: "blue",
    water: "cyan",
  };

  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="id" title="ID" />
        <Table.Column dataIndex="name" title="卦象名称" />
        <Table.Column
          dataIndex="element"
          title="五行属性"
          render={(value: string) => (
            <Tag color={elementColors[value as keyof typeof elementColors]}>
              {value === 'wood' && '木'}
              {value === 'fire' && '火'}
              {value === 'earth' && '土'}
              {value === 'metal' && '金'}
              {value === 'water' && '水'}
            </Tag>
          )}
        />
        <Table.Column
          dataIndex="description"
          title="描述"
          render={(value: string) => (
            <div style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {value}
            </div>
          )}
        />
        <Table.Column
          dataIndex="isActive"
          title="状态"
          render={(value: boolean) => (
            <TagField value={value ? "启用" : "禁用"} color={value ? "green" : "red"} />
          )}
        />
        <Table.Column
          dataIndex="createdAt"
          title="创建时间"
          render={(value: any) => <DateField value={value} />}
        />
        <Table.Column
          title="操作"
          dataIndex="actions"
          render={(_, record: any) => (
            <Space>
              <EditButton hideText size="small" recordItemId={record.id} />
              <ShowButton hideText size="small" recordItemId={record.id} />
              <DeleteButton hideText size="small" recordItemId={record.id} />
            </Space>
          )}
        />
      </Table>
    </List>
  );
};
