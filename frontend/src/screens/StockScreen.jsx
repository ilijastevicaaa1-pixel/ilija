import React, { Component } from 'react';

class StockScreen extends Component {
  constructor(props) {
    super(props);
    this.state = {
      stocks: [],
      loading: true,
      error: null
    };
  }

  componentDidMount() {
    this.loadStocks();
  }

  async loadStocks() {
    try {
      // Privremeni mock podaci dok ne napraviš pravi API
      const stocks = [
        { id: 1, name: 'Akcija A' },
        { id: 2, name: 'Akcija B' },
        { id: 3, name: 'Akcija C' }
      ];

      this.setState({ stocks, loading: false });
    } catch (error) {
      this.setState({
        error: 'Greška pri učitavanju podataka.',
        loading: false
      });
    }
  }

  render() {
    const { stocks, loading, error } = this.state;

    if (loading) {
      return <div style={{ padding: 24, fontSize: 18 }}>Učitavanje...</div>;
    }

    if (error) {
      return <div style={{ color: 'red', padding: 24 }}>{error}</div>;
    }

    return (
      <div style={{ padding: 24 }}>
        <div style={{ fontWeight: 'bold', fontSize: 24, marginBottom: 16 }}>
          Stocks
        </div>

        {stocks.length === 0 ? (
          <div>Nema podataka.</div>
        ) : (
          stocks.map(stock => (
            <div
              key={stock.id}
              style={{
                marginBottom: 12,
                border: '1px solid #eee',
                borderRadius: 4,
                padding: 12
              }}
            >
              {stock.name}
            </div>
          ))
        )}
      </div>
    );
  }
}

export default StockScreen;


