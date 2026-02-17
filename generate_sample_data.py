"""
Generate sample transaction data for testing the Budget Tracker app.
Run this script to create a sample CSV file you can import.
"""
import csv
import random
from datetime import datetime, timedelta

# Sample data
MERCHANTS = {
    'Housing': [
        ('Rent Payment', -2500.00),
        ('Electric Company', -120.00),
        ('Gas Utility', -65.00),
        ('Water Dept', -45.00),
        ('Home Depot', -89.50),
        ('Lowes', -156.23),
        ('Hardware Store', -23.99),
    ],
    'Food': [
        ('Whole Foods Market', -156.78),
        ('Trader Joes', -89.45),
        ('Kroger', -124.30),
        ('Safeway', -67.89),
        ('McDonalds', -12.50),
        ('Starbucks', -5.75),
        ('Chipotle', -15.20),
        ('Pizza Hut', -28.50),
        ('Local Restaurant', -65.00),
        ('Sushi Place', -45.00),
    ],
    'Transportation': [
        ('Shell Gas Station', -45.00),
        ('Chevron', -52.30),
        ('Uber', -23.50),
        ('Lyft', -18.75),
        ('Auto Repair Shop', -340.00),
        ('Parking Meter', -8.00),
        ('Toll Pass', -15.00),
    ],
    'Shopping': [
        ('Amazon', -89.99),
        ('Target', -156.78),
        ('Walmart', -234.56),
        ('Best Buy', -499.99),
        ('Costco', -245.30),
        ('Nike Store', -125.00),
        ('Apple Store', -29.99),
    ],
    'Entertainment': [
        ('Netflix', -15.99),
        ('Spotify', -9.99),
        ('Movie Theater', -32.50),
        ('Steam Games', -59.99),
        ('Concert Tickets', -120.00),
        ('Bowling Alley', -45.00),
    ],
    'Health': [
        ('CVS Pharmacy', -34.50),
        ('Walgreens', -28.99),
        ('Doctor Office', -125.00),
        ('Dentist', -250.00),
        ('Gym Membership', -45.00),
    ],
    'Financial': [
        ('Investment Transfer', -500.00),
        ('Bank Fee', -12.00),
        ('Credit Card Payment', -1500.00),
    ],
    'Travel': [
        ('United Airlines', -450.00),
        ('Marriott Hotel', -320.00),
        ('Enterprise Rent-A-Car', -189.00),
        ('Gas Station (Trip)', -48.50),
    ],
}

INCOME_SOURCES = [
    ('Employer Inc - Salary', 8500.00),
    ('Freelance Client', 1250.00),
    ('Stock Dividend', 125.50),
    ('Tax Refund', 850.00),
]

def generate_sample_data(filename='sample_transactions.csv', months=6):
    """Generate sample transaction CSV."""
    
    transactions = []
    end_date = datetime.now()
    start_date = end_date - timedelta(days=30*months)
    
    # Generate ~200 random transactions
    current_date = start_date
    while current_date < end_date:
        # Add 3-8 transactions per day
        for _ in range(random.randint(3, 8)):
            if random.random() < 0.1:  # 10% chance of income
                source, amount = random.choice(INCOME_SOURCES)
                transactions.append({
                    'date': current_date.strftime('%Y-%m-%d'),
                    'description': source,
                    'amount': amount,
                })
            else:
                # Pick a random category and merchant
                category = random.choice(list(MERCHANTS.keys()))
                merchant, base_amount = random.choice(MERCHANTS[category])
                
                # Add some variance to amount
                amount = base_amount * random.uniform(0.8, 1.2)
                
                transactions.append({
                    'date': current_date.strftime('%Y-%m-%d'),
                    'description': merchant,
                    'amount': round(amount, 2),
                })
        
        current_date += timedelta(days=1)
    
    # Sort by date
    transactions.sort(key=lambda x: x['date'])
    
    # Write to CSV
    with open(filename, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['date', 'description', 'amount'])
        writer.writeheader()
        writer.writerows(transactions)
    
    print(f"Generated {len(transactions)} sample transactions in {filename}")
    
    # Print summary
    total_income = sum(t['amount'] for t in transactions if t['amount'] > 0)
    total_expense = sum(t['amount'] for t in transactions if t['amount'] < 0)
    
    print(f"\nSummary:")
    print(f"  Total Income: ${total_income:,.2f}")
    print(f"  Total Expenses: ${abs(total_expense):,.2f}")
    print(f"  Net: ${total_income + total_expense:,.2f}")

if __name__ == '__main__':
    generate_sample_data()
