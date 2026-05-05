export function serializeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    preferences: user.preferences,
    createdAt: user.createdAt,
  };
}

export function serializeTransaction(transaction) {
  return {
    _id: transaction._id,
    type: transaction.type,
    title: transaction.title,
    category: transaction.category,
    amount: transaction.amount,
    date: transaction.date,
    notes: transaction.notes,
    paymentMethod: transaction.paymentMethod,
    status: transaction.type === 'income' ? 'Received' : 'Completed',
    createdAt: transaction.createdAt,
  };
}
