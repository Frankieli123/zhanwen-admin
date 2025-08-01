import React from "react";
import {
  Show,
  TextField,
  TagField,
  DateField,
  BooleanField,
} from "@refinedev/antd";
import { Typography, Card, Row, Col, Tag, List as AntList } from "antd";
import type { IResourceComponentsProps } from "@refinedev/core";

const { Title, Text } = Typography;

export const HexagramShow: React.FC<IResourceComponentsProps> = () => {
  const elementColors = {
    wood: "green",
    fire: "red", 
    earth: "orange",
    metal: "blue",
    water: "cyan",
  };

  const elementNames = {
    wood: '木',
    fire: '火',
    earth: '土',
    metal: '金',
    water: '水',
  };

  return (
    <Show>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card title="基本信息">
            <Row gutter={[16, 16]}>
              <Col span={8}>
                <Title level={5}>卦象名称</Title>
                <TextField source="name" />
              </Col>
              <Col span={8}>
                <Title level={5}>五行属性</Title>
                <TagField 
                  source="element" 
                  render={(value: string) => (
                    <Tag color={elementColors[value as keyof typeof elementColors]}>
                      {elementNames[value as keyof typeof elementNames]}
                    </Tag>
                  )}
                />
              </Col>
              <Col span={8}>
                <Title level={5}>状态</Title>
                <BooleanField 
                  source="isActive"
                  valueLabelTrue="启用"
                  valueLabelFalse="禁用"
                />
              </Col>
            </Row>
          </Card>
        </Col>

        <Col span={24}>
          <Card title="详细描述">
            <Title level={5}>描述</Title>
            <TextField source="description" />
            
            <Title level={5} style={{ marginTop: 16 }}>解释</Title>
            <TextField source="interpretation" />
          </Card>
        </Col>

        <Col span={12}>
          <Card title="有利行动">
            <AntList
              dataSource={[]} // 这里应该绑定到 favorableActions
              renderItem={(item: string) => (
                <AntList.Item>
                  <Tag color="green">{item}</Tag>
                </AntList.Item>
              )}
            />
          </Card>
        </Col>

        <Col span={12}>
          <Card title="不利行动">
            <AntList
              dataSource={[]} // 这里应该绑定到 unfavorableActions
              renderItem={(item: string) => (
                <AntList.Item>
                  <Tag color="red">{item}</Tag>
                </AntList.Item>
              )}
            />
          </Card>
        </Col>

        <Col span={24}>
          <Card title="时间信息">
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Title level={5}>创建时间</Title>
                <DateField source="createdAt" />
              </Col>
              <Col span={12}>
                <Title level={5}>更新时间</Title>
                <DateField source="updatedAt" />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </Show>
  );
};
