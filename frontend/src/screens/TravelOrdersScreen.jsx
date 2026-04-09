import React, { Component } from 'react';

class TravelOrdersScreen extends Component {
  constructor(props) {
    super(props);
    this.state = {
      travelOrders: [],
      loading: true,
      error: null
    };
  }

  componentDidMount() {
    this.loadTravelOrders();
  }

  async loadTravelOrders() {
    try {
      // Privremeni mock podaci dok ne napraviš pravi API
      const travelOrders = [
        { id: 1, name: 'Putni nalog 1' },
        { id: 2, name: 'Putni nalog 2' },
        { id: 3, name: 'Putni nalog 3' }
      ];

      this.setState({ travelOrders, loading: false });
    } catch (error) {
      this.setState({ error: 'Greška pri učitavanju podataka.', loading: false });
    }
  }

  render() {
    const { travelOrders, loading, error } = this.state;

    if (loading) {
      return <div style={{ padding: 24, fontSize: 18 }}>Učitavanje...</div>;
    }

    if (error) {
      return <div style={{ padding: 24, color: 'red' }}>{error}</div>;
    }

    return (
      <div style={{ padding: 24 }}>
        <h2>Travel Orders</h2>

        {travelOrders.length === 0 ? (
          <div>Nema putnih naloga.</div>
        ) : (
          travelOrders.map(order => (
            <div
              key={order.id}
              style={{
                marginBottom: 12,
                padding: 12,
                border: '1px solid #ddd',
                borderRadius: 4
              }}
            >
              {order.name}
            </div>
          ))
        )}
      </div>
    );
  }
}

export default TravelOrdersScreen;


