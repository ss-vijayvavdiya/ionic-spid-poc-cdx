import React from 'react';
import { IonItem, IonLabel, IonList, IonSkeletonText } from '@ionic/react';

interface ListSkeletonProps {
  rows?: number;
}

const ListSkeleton: React.FC<ListSkeletonProps> = ({ rows = 4 }) => {
  return (
    <IonList>
      {Array.from({ length: rows }).map((_, index) => (
        <IonItem key={`skeleton-${index}`}>
          <IonLabel>
            <h3>
              <IonSkeletonText animated style={{ width: '50%' }} />
            </h3>
            <p>
              <IonSkeletonText animated style={{ width: '70%' }} />
            </p>
          </IonLabel>
        </IonItem>
      ))}
    </IonList>
  );
};

export default ListSkeleton;
