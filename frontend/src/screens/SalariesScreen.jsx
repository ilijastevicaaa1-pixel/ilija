import React, { Component } from 'react';
// import { View, Text, StyleSheet, Dimensions } from 'react-native';
// import { connect } from 'react-redux';
// import { getSalaries } from '../actions/salaries'; // Uklonjeno: fajl ne postoji
// import { getSalariesScreen } from '../selectors/salaries'; // Uklonjeno: fajl ne postoji



class SalariesScreen extends Component {
    constructor(props) {
        super(props);
    }

    componentDidMount() {
        this.props.getSalaries();
    }

    render() {
        const { salaries = [] } = this.props;
        return (
            <div style={{ padding: 24 }}>
                <div style={{ fontWeight: 'bold', fontSize: 24, marginBottom: 16 }}>Salaries</div>
                <div>
                    {salaries.length === 0 ? (
                        <span>Nema podataka o platama.</span>
                    ) : (
                        salaries.map(salary => (
                            <div key={salary.id} style={{ marginBottom: 8 }}>
                                <span>{salary.name}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    }
}

export default SalariesScreen;
