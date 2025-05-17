import { Platform } from 'react-native';
import ColorsModule from './colors';

const Colors = ColorsModule.Colors;

const additionalStyles = {
  mainActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  mainActionButton: {
    backgroundColor: Colors.primary,
    width: '48%',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginBottom: 15,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  mainActionIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  mainActionIcon: {
    fontSize: 24,
    color: Colors.white,
  },
  mainActionText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
  premiumButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  premiumButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
};

export default additionalStyles;