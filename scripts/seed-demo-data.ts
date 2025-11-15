import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Realistic demo employees for video
const demoEmployees = [
  {
    name: 'Alice Johnson - Senior Blockchain Developer',
    email: 'alice@paystream.demo',
    salary_annual: 95000,
    wallet_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
    pay_status: 'active',
  },
  {
    name: 'Bob Smith - Full Stack Developer',
    email: 'bob@paystream.demo',
    salary_annual: 85000,
    wallet_address: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
    pay_status: 'active',
  },
  {
    name: 'Carol White - Senior UI/UX Designer',
    email: 'carol@paystream.demo',
    salary_annual: 90000,
    wallet_address: '0xdD2FD4581271e230360230F9337D5c0430Bf44C0',
    pay_status: 'active',
  },
  {
    name: 'David Brown - Backend Engineer',
    email: 'david@paystream.demo',
    salary_annual: 80000,
    wallet_address: '0x2546BcD3c84621e976D8185a91A922aE77ECEc30',
    pay_status: 'active',
  },
  {
    name: 'Eve Davis - Product Manager',
    email: 'eve@paystream.demo',
    salary_annual: 88000,
    wallet_address: '0xbDA5747bFD65F08deb54cb465eB87D40e51B197E',
    pay_status: 'active',
  },
  {
    name: 'Frank Wilson - DevOps Engineer',
    email: 'frank@paystream.demo',
    salary_annual: 92000,
    wallet_address: '0x959FD7Ef9089B7142B6b908Dc3A8af7Aa8ff0fA3',
    pay_status: 'pending',
  },
  {
    name: 'Grace Martinez - Marketing Manager',
    email: 'grace@paystream.demo',
    salary_annual: 78000,
    wallet_address: '0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db',
    pay_status: 'pending',
  },
  {
    name: 'Henry Lee - Smart Contract Developer',
    email: 'henry@paystream.demo',
    salary_annual: 83000,
    wallet_address: '0x3E5e9111Ae8eB78Fe1CC3bb8915d5D461F3Ef9A9',
    pay_status: 'active',
  },
  {
    name: 'Ivy Chen - UI Designer',
    email: 'ivy@paystream.demo',
    salary_annual: 86000,
    wallet_address: '0x1dF62f291b2E969fB0849d99D9Ce41e2F137006e',
    pay_status: 'pending',
  },
  {
    name: 'Jack Taylor - Senior Frontend Engineer',
    email: 'jack@paystream.demo',
    salary_annual: 94000,
    wallet_address: '0x6813Eb9362372EEF6200f3b1dbC3f819671cBA69',
    pay_status: 'active',
  },
  {
    name: 'Karen Anderson - Financial Analyst',
    email: 'karen@paystream.demo',
    salary_annual: 81000,
    wallet_address: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    pay_status: 'paid',
  },
  {
    name: 'Liam Garcia - Data Engineer',
    email: 'liam@paystream.demo',
    salary_annual: 89000,
    wallet_address: '0x75Bc50a5664657c51F2D88E1F6E96d0D9c2A851e',
    pay_status: 'paid',
  },
];

// Sample payment history for some employees
const demoPayments = [
  {
    employee_email: 'alice@paystream.demo',
    amount: 3654.17, // Biweekly: 95000 / 26
    currency: 'USDC',
    status: 'confirmed',
    tx_hash: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
    block_number: 12458923,
    gas_used: 145000,
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days ago
  },
  {
    employee_email: 'bob@paystream.demo',
    amount: 3269.23,
    currency: 'USDC',
    status: 'confirmed',
    tx_hash: '0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c',
    block_number: 12458923,
    gas_used: 145000,
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    employee_email: 'carol@paystream.demo',
    amount: 3461.54,
    currency: 'USDC',
    status: 'confirmed',
    tx_hash: '0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d',
    block_number: 12458923,
    gas_used: 145000,
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    employee_email: 'karen@paystream.demo',
    amount: 3115.38,
    currency: 'USDC',
    status: 'confirmed',
    tx_hash: '0x4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e',
    block_number: 12458850,
    gas_used: 145000,
    created_at: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(), // 28 days ago
  },
  {
    employee_email: 'liam@paystream.demo',
    amount: 3423.08,
    currency: 'USDC',
    status: 'confirmed',
    tx_hash: '0x5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f',
    block_number: 12458850,
    gas_used: 145000,
    created_at: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

async function seedDemoData() {
  console.log('🌱 Seeding demo data for Paystream AI...\n');

  try {
    // 1. Clear existing demo data
    console.log('🧹 Clearing existing demo data...');
    const { error: deleteError } = await supabase
      .from('employees')
      .delete()
      .like('email', '%@paystream.demo');

    if (deleteError) {
      console.log('⚠️  No existing demo data found (or error clearing)');
    } else {
      console.log('✅ Cleared existing demo data\n');
    }

    // 2. Insert demo employees
    console.log('👥 Inserting demo employees...');
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .insert(demoEmployees)
      .select();

    if (employeesError) {
      throw new Error(`Failed to insert employees: ${employeesError.message}`);
    }

    console.log(`✅ Inserted ${employees?.length || 0} demo employees\n`);

    // 3. Insert payment history
    console.log('💰 Inserting payment history...');

    // Map emails to employee IDs
    const paymentsWithIds = [];
    for (const payment of demoPayments) {
      const employee = employees?.find((e: any) => e.email === payment.employee_email);
      if (employee) {
        paymentsWithIds.push({
          employee_id: employee.id,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          tx_hash: payment.tx_hash,
          block_number: payment.block_number,
          gas_used: payment.gas_used,
          created_at: payment.created_at,
        });
      }
    }

    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .insert(paymentsWithIds)
      .select();

    if (paymentsError) {
      console.log(`⚠️  Warning: Could not insert payments: ${paymentsError.message}`);
    } else {
      console.log(`✅ Inserted ${payments?.length || 0} payment records\n`);
    }

    // 4. Display summary
    console.log('📊 Demo Data Summary:\n');
    console.log('┌────────────────────────────────┬────────┐');
    console.log('│ Metric                         │ Count  │');
    console.log('├────────────────────────────────┼────────┤');
    console.log(`│ Total Employees                │ ${employees?.length || 0}      │`);
    console.log(`│ Active Employees               │ ${employees?.filter((e: any) => e.pay_status === 'active').length || 0}      │`);
    console.log(`│ Pending Employees              │ ${employees?.filter((e: any) => e.pay_status === 'pending').length || 0}      │`);
    console.log(`│ Paid Employees                 │ ${employees?.filter((e: any) => e.pay_status === 'paid').length || 0}      │`);
    console.log(`│ Payment Records                │ ${payments?.length || 0}      │`);
    console.log('└────────────────────────────────┴────────┘\n');

    // 5. Display sample employees for demo
    console.log('👤 Sample Employees for Demo:\n');
    employees?.slice(0, 5).forEach((emp: any, i: number) => {
      console.log(`${i + 1}. ${emp.name}`);
      console.log(`   Email: ${emp.email}`);
      console.log(`   Salary: $${emp.salary_annual.toLocaleString()}/year`);
      console.log(`   Wallet: ${emp.wallet_address}`);
      console.log(`   Status: ${emp.pay_status}\n`);
    });

    console.log('✨ Demo data seeding complete!');
    console.log('\n📝 Sample Queries for Demo:\n');
    console.log('1. "Show me all blockchain developers"');
    console.log('2. "Who are the senior engineers?"');
    console.log('3. "What\'s our total monthly payroll?"');
    console.log('4. "Show me all pending employees"');
    console.log('5. "Display payment history for Alice Johnson"\n');

    console.log('🎬 Ready to record demo video!\n');
  } catch (error) {
    console.error('❌ Error seeding demo data:');
    console.error(error);
    process.exit(1);
  }
}

seedDemoData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
