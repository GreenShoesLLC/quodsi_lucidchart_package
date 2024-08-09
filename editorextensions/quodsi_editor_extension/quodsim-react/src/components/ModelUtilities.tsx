import React from 'react';
import styles from './ModelUtilities.module.css';
import { LucidChartMessageClass } from 'src/app/models/LucidChartMessage';


interface ModelUtilitiesProps {
    showConvertButton?: boolean;
    showValidateButton?: boolean;
    showRemoveButton?: boolean;
}

const ModelUtilities: React.FC<ModelUtilitiesProps> = ({
    showConvertButton = false,
    showValidateButton = false,
    showRemoveButton = false
}) => {

    // Utility function to create and send a message
    const sendMessage = (messageType: string) => {
        const message = LucidChartMessageClass.createMessage(
            messageType,
            '{}', // Assuming empty instance data for simplicity
            ''
        ).toObject();
        window.parent.postMessage(message, '*');
    };

    return (
        <div className={styles['button-container']}>
            {showConvertButton && (
                <button
                    className={`${styles['lucid-styling']} ${styles['primary']}`}
                    onClick={() => sendMessage('ConvertPageToModel')}
                >
                    Convert Page to Model
                </button>
            )}
            {showValidateButton && (
                <button
                    className={`${styles['lucid-styling']} ${styles['secondary']}`}
                    onClick={() => sendMessage('ValidateModel')}
                >
                    Validate Model
                </button>
            )}
            {showRemoveButton && (
                <button
                    className={`${styles['lucid-styling']} ${styles['tertiary']}`}
                    onClick={() => sendMessage('RemoveModel')}
                >
                    Remove Model
                </button>
            )}
        </div>
    );
};

export default ModelUtilities;
