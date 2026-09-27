import React from 'react';
import { Card, Typography, Button } from 'antd';
import { EllipsisOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

const VoucherCard: React.FC<{ title: string; description: string; amount: number }> = ({ title, description, amount }) => {
  return (
    <Card title={title} style={{ width: 300, marginBottom: 20 }}>
      <Paragraph ellipsis={{ tooltip: description }}>
        {description}
      </Paragraph>
      <Title level={4} style={{ color: '#10B981' }}>
        ${amount.toFixed(2)}
      </Title>
      <Button type="primary" style={{ marginTop: 10 }}>
        Redeem
      </Button>
    </Card>
  );
};

export default VoucherCard;
