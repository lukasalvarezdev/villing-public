import { useBuilderContext } from './builder/context';
import { CreateClientButton } from './create-client-button';
import { useLegalActions } from './misc';
import { RecipientSelect } from './recipient-select';

type BuilderRecipientsProps = {
	showCreate?: boolean;
};
export function BuilderRecipients(props: BuilderRecipientsProps) {
	const { showCreate = true } = props;
	const { legalActions } = useLegalActions();
	const {
		dispatch,
		state: { client, supplier },
	} = useBuilderContext();

	if (
		!legalActions.includes('update client') &&
		!legalActions.includes('update supplier')
	) {
		return null;
	}

	return (
		<div>
			{legalActions.includes('update client') ? (
				<RecipientSelect
					onSelect={client => {
						dispatch({ type: 'setClient', payload: client });
					}}
					recipient={client}
					type="clients"
				>
					{showCreate ? (
						<CreateClientButton
							onCreate={client => {
								dispatch({ type: 'setClient', payload: client });
							}}
						/>
					) : null}
				</RecipientSelect>
			) : null}
			{legalActions.includes('update supplier') ? (
				<RecipientSelect
					onSelect={supplier => {
						dispatch({ type: 'setSupplier', payload: supplier });
					}}
					recipient={supplier}
					type="suppliers"
				/>
			) : null}
		</div>
	);
}
