import { useState, useEffect } from "react";
import {
  Divider,
  Link,
  Button,
  Text,
  Input,
  Flex,
  ButtonRow,
  hubspot,
} from "@hubspot/ui-extensions";
import { getPropertySet } from './configs/properties.js';
import { CrmPropertyList, useCrmProperties, useAssociations, CrmActionButton, CrmCardActions } from '@hubspot/ui-extensions/crm';

// Define the extension to be run within the Hubspot CRM
hubspot.extend(({ context, actions }) => (
  <Extension
    context={context}
    sendAlert={actions.addAlert}
  />
));

// helper: split array into chunks of size (≤24 for CrmPropertyList)
const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

// Define the Extension component, taking in runServerless, context, & sendAlert as props
const Extension = ({ context, sendAlert }) => {
  const [text, setText] = useState("Loading...");
  const [associations, setAssociations] = useState(null);
  console.log('context: ', context?.crm?.objectId);
  
const dealId = context?.crm?.objectId;
const dealTypeId = context?.crm?.objectTypeId; // should be '0-3' on deals
const portalId = context?.portalId;

const [assocApi, setAssocApi] = useState({ ok: null, json: null, error: null });

  // Get CRM properties
  const { properties, isLoading, error } = useCrmProperties(['intake_name', 'intake_form_type']);
  const { results: assocResults = [], loading: assocLoading, error: assocError } = useAssociations({
    // toObjectType: '2-48847550', //Staging
    toObjectType: 'p_intake',
    // associationTypeIds: [177],
    properties: [
      'intake_form_type',
      'hs_object_id',
      'customer_box_account_id',
      'document_packet_id',
      'entity_type',
      'docgen_folder_id',
    ],
    limit: 50,
  });

  // safe guards
  let formType = null, entityType = null, documentPacketId = null,
  assocObjId = null, docgenFolderId = null, customerBoxAccountId = null, envelopeId = null;

console.log('assocResults', assocResults);
console.log('assocErrors', assocError);
console.log('assocLoading', assocLoading);
  console.log('properties', properties)

  //TODO: If no formtype set send error that is easy to understand
  // let formType = null;
  // let entityType = null;
  // let documentPacketId = null;
  // let assocObjId = null;
  // let docgenFolderId = null;
  // let customerBoxAccountId = null;

  if (assocResults.length > 0) {
    formType = assocResults[0].properties.intake_form_type
    entityType = assocResults[0].properties.entity_type
    documentPacketId = assocResults[0].properties.document_packet_id
    assocObjId = assocResults[0].properties.hs_object_id
    docgenFolderId = assocResults[0].properties.docgen_folder_id
    customerBoxAccountId = assocResults[0].properties.customer_box_account_id
    // envelopeId = assocResults[0].properties.docusign_envelope_id
  }

  console.log('documentPacketId: ', documentPacketId)
  console.log('associations', assocResults)
  // const assocCrmProperties = getPropertySet(assocResults[1].properties.intake_form_type);

  console.log("entity Type", entityType);
  console.log("form Type", formType);
  // console.log("assocResultsId", assocResults[0].properties.entity_type);
  const BUILD_ID = "BUILD 2025-09-25 06:16 MT";
  console.log("CARD BUILD", BUILD_ID);
  // console.log('assoc crm properties: ', assocCrmProperties);

  // const objectId = context.objectId || 41361674390;
  const objectId = context.objectId
  // const objectTypeId = context.objectTypeId || '2-48847550';
  const objectTypeId = context.objectTypeId || '2-57729126';
  const fromObjectId = objectId;
  const fromTypeId = objectTypeId;

  console.log('context: ', context?.crm?.objectId);
  
  const crmProperties = getPropertySet(formType)?.properties ?? [];

  // split properties into ≤24 chunks
  const propChunks = chunk(crmProperties, 24);
  console.log('box account id', customerBoxAccountId, crmProperties)

  return (
    <>
<Divider />
      <Flex direction="column" gap="medium">
        <Text>Current object ID: {objectId}</Text>
        {associations && (
          <Flex direction="column" gap="small">
            <Text>Associations found:</Text>
            <Text>{JSON.stringify(associations, null, 2)}</Text>
          </Flex>
        )}
      </Flex>
      
      {assocObjId && (
        <CrmCardActions
          actionConfigs={[
            {
              type: 'action-library-button',
              label: 'Open Intake',
              actionType: 'EXTERNAL_URL',
              actionContext: {
                href: `https://kkos.developernews.tech/forms/intake/${assocObjId}`,
              },
              tooltipText: 'Open intake form',
            },
          ]}
        />
      )}
      <Button
        variant="primary"
        disabled={!customerBoxAccountId}
        onClick={async () => {
          try {
            // const res = await hubspot.fetch(
            //   'https://monogrammic-nonideological-everett.ngrok-free.dev/api/v1/intake/packet/generate',
            //   {
            //     method: 'POST',
            //     body: {
            //       intakeId: String(assocObjId),
            //       formType: formType,
            //       entityType,
            //       docgenFolderId,
            //       boxFolderId: String(customerBoxAccountId),
            //     },
            //   }
            // );
            const res = await hubspot.fetch(
              'https://kkos.developernews.tech/api/v1/intake/packet/generate',
              {
                method: 'POST',
                body: {
                  intakeId: String(assocObjId),
                  formType: formType,
                  entityType,
                  docgenFolderId,
                  boxFolderId: String(customerBoxAccountId),
                },
              }
            );

            // read body once (handles 200/201/204)
            let raw = '';
            try {
              raw = await res.text();
            } catch (e) {
              console.log('error', e)
              raw = '';
            }

            console.log('res', res)
            if (!res.ok) {
              const msg = `Server error: ${res.status}${raw ? ` – ${raw}` : ''}`;
              throw new Error(msg);
            }

            let data = null;
            try {
              data = raw ? JSON.parse(raw) : null;
            } catch (e) {
              data = null; // ignore parse errors on success
            }

            const fileId = data?.file?.id;
            const fileName = data?.file?.name;

            sendAlert({
              type: 'success',
              message: fileId
                ? `Document packet created in Box: ${fileName || fileId}`
                : 'Document packet generated.',
            });
          } catch (err) {
            console.error(err);
            sendAlert({ type: 'danger', message: err.message });
          }
        }}
      >
        Generate Document Packet
      </Button>
      <Button
        variant="primary"
        onClick={async () => {
          try {
            // const res = await hubspot.fetch(
            //   'https://monogrammic-nonideological-everett.ngrok-free.dev/api/v1/intake/packet/signature',
            //   {
            //     method: 'POST',
            //     body: {
            //       intakeId: String(assocObjId),
            //       formType,
            //       documentPacketId,
            //       boxFolderId: String(customerBoxAccountId),
            //       envelopeId,
            //     },
            //   }
            // );
            const res = await hubspot.fetch(
              'https://kkos.developernews.tech/api/v1/intake/packet/signature',
              {
                method: 'POST',
                body: {
                  intakeId: String(assocObjId),
                  formType,
                  documentPacketId,
                  boxFolderId: String(customerBoxAccountId),
                  // envelopeId,
                },
              }
            );

            let raw = '';
            try {
              raw = await res.text();
            } catch (e) {
              raw = '';
            }

            if (!res.ok) {
              const msg = `Server error: ${res.status}${raw ? ` – ${raw}` : ''}`;
              throw new Error(msg);
            }

            let data = null;
            try {
              data = raw ? JSON.parse(raw) : null;
            } catch (e) {
              data = null;
            }

            const fileId = data?.file?.id;
            const fileName = data?.file?.name;

            sendAlert({
              type: 'success',
              message: 'Document sent for signature.',
            });
          } catch (err) {
            console.error(err);
            sendAlert({ type: 'danger', message: err.message });
          }
        }}
      >
        Request Signature(s)
      </Button>
      <Divider />
      
      {assocObjId !== null && (
        <>
          {propChunks.map((props, idx) => (
            <Flex key={idx} direction="column" gap="xsmall">
              {propChunks.length > 1 && (
                <Text muted>Section {idx + 1} of {propChunks.length}</Text>
              )}
              <CrmPropertyList
                // objectTypeId="2-48847550" Staging
                objectTypeId="2-57729126"
                objectId={assocObjId}
                properties={props}
                direction="row"
              />
              {idx < propChunks.length - 1 && <Divider />}
            </Flex>
          ))}
        </>
      )}
    </>
  );
};
