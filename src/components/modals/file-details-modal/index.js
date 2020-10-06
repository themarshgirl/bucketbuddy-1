import React, { useRef, useState, useEffect } from 'react';
import { deleteObject, getSignedURL } from '../../utils/amazon-s3-utils';
import { schemaFileName } from '../../modules/BucketViewer';
import EditObjectTagsModal from '../edit-tags-modal';
import { withRouter } from 'react-router-dom';
import {
  Modal,
  List,
  ListHeader,
  ListDescription,
  ListContent,
  Button,
  Label,
  Icon,
  Message,
  Confirm,
  Grid,
  GridRow,
  GridColumn,
  Segment
} from 'semantic-ui-react';
import './file-details-modal.scss';

const FileDetailsModal = (props) => {
  const { bucket, schemaInfo, updateTagState } = props;
  const [showConfirm, setShowConfirm] = useState(false);
  const [conformsToSchema, setConformsToSchema] = useState(true);
  const [downloadLink, setDownloadLink] = useState('');
  // This property is the combined tags of the files tags and the schema's tags
  const [file, setFile] = useState(props.file);
  const fileTest = /\.(jpe?g|png|gif|bmp)$/i;
  const imagec = useRef(null);

  useEffect(() => {}, [file]);

  useEffect(() => {
    if (file && file === props.file) {
      if (downloadLink === '') {
        getSignedURL(bucket, file.Key).then(setDownloadLink);
      }
      if (file.TagSet && file.TagSet.length > 0) {
        const schemaKeys = getKeys(schemaInfo.tagset);
        const fileKeys = getKeys(file.TagSet);
        if (schemaKeys) {
          setConformsToSchema(
            schemaKeys.every((schemaKey) => fileKeys.includes(schemaKey))
          );
        }
      } else {
        if (schemaInfo) {
          setConformsToSchema(schemaInfo.available === false);
        } else {
          setConformsToSchema(false);
        }
      }
    } else if (props.file !== file) {
      setFile(props.file);
    }
  });

  const showConfirmDelete = () => {
    setShowConfirm(true);
  };

  const closeConfirmDelete = () => {
    setShowConfirm(false);
  };

  /**
   *
   * @param {AWS.S3.GetObjectOutput} response
   */
  const getKeys = (array, keyName = 'key') => {
    if (array.length > 0) {
      return array.map((val) => val[keyName]).sort();
    } else {
      return [];
    }
  };

  const deleteFile = () => {
    deleteObject(bucket, file.Key);
    props.handleClose();
    props.updateList();
  };

  const getImage = () => {
    if (fileTest.test(file.filename)) {
      //Using "div" and "img" instead of the Image object so that a ref could be made
      return (
        <div class="ui medium middle aligned image">
          <img crossOrigin="anonymous" ref={imagec} src={file.src} />
        </div>
      );
    } else {
      return <Icon name="file" className="card-file-icon" />;
    }
  };

  const combineTags = () => {
    const tagset = [];
    //The reason for creating and turning the set back into the array was to
    // quickly get rid of repeating values as a set only contains unique values.
    const totalKeys = [
      ...new Set([...getKeys(schemaInfo.tagset), ...getKeys(file.TagSet)])
    ];
    if (totalKeys) {
      totalKeys.forEach((key, i) => {
        let schemaSet = schemaInfo.tagset.find((set) => set['key'] === key);
        let fileSet = file.TagSet.find((set) => set['key'] === key);
        tagset.push({
          ...schemaSet,
          ...fileSet
        });
        if (schemaSet && !fileSet) {
          tagset[i].showNeeded = true;
        }
      });
      return tagset;
    }
  };
  return (
    <Modal
      open={props.modalOpen}
      onClose={() => {
        setFile(null);
        props.handleClose();
      }}
      className="details-modal"
      closeIcon
    >
      <Modal.Header>{file && file.filename}</Modal.Header>
      {file && (
        <Modal.Content image>
          {file.filename !== schemaFileName && getImage()}
          <Modal.Description>
            {file.filename === schemaFileName && (
              <Message className="s3-message">
                <Message.Header>Bucket Buddy Schema</Message.Header>
                <p>
                  This file is so we know what values you want to set to your
                  objects' tags.
                  <br />
                  You can delete this but you will have to make another one
                </p>
              </Message>
            )}
            <Segment className="file-segment">
              {!conformsToSchema && file.filename !== schemaFileName && (
                <Label color="red" ribbon>
                  Does not conform to Schema
                </Label>
              )}
              <Grid columns={file.filename === schemaFileName ? 2 : 1}>
                <GridRow divided>
                  <GridColumn>
                    <List className="file-details" divided>
                      <Label attached="top">File Data</Label>
                      <List.Item>
                        <ListContent>
                          <ListHeader>Path</ListHeader>
                          <ListDescription>{file.Key}</ListDescription>
                        </ListContent>
                      </List.Item>
                      {file.TagSet &&
                        file.TagSet.map((set, i) => (
                          <List.Item>
                            <ListContent>
                              <ListHeader>{set.key}</ListHeader>
                              <ListDescription>{set.value}</ListDescription>
                            </ListContent>
                          </List.Item>
                        ))}
                      <List.Item>
                        <ListContent>
                          <ListHeader>LastModified</ListHeader>
                          <ListDescription>
                            {file.LastModified.toString()}
                          </ListDescription>
                        </ListContent>
                      </List.Item>
                      <List.Item>
                        <ListContent>
                          <ListHeader>Size</ListHeader>
                          <ListDescription>{file.Size}</ListDescription>
                        </ListContent>
                      </List.Item>
                      <List.Item>
                        <ListContent>
                          <ListHeader>Storage Class</ListHeader>
                          <ListDescription>{file.StorageClass}</ListDescription>
                        </ListContent>
                      </List.Item>
                      <List.Item>
                        <ListContent>
                          {file.TagSet && file.filename !== schemaFileName && (
                            <EditObjectTagsModal
                              bucket={bucket}
                              keyValue={file.Key}
                              tagset={combineTags()}
                              updateTagState={(key, tagset) => {
                                setFile(
                                  Object.assign(file, { TagSet: tagset })
                                );
                                updateTagState(key, tagset);
                              }}
                              trigger={<Button size="medium">Edit Tags</Button>}
                            />
                          )}
                          {downloadLink !== '' && (
                            <a
                              download=""
                              href={downloadLink}
                              target="_blank"
                              class="ui button"
                              role="button"
                            >
                              Download
                            </a>
                          )}
                          <Button color="blue" onClick={showConfirmDelete}>
                            Delete File
                          </Button>
                          <Confirm
                            open={showConfirm}
                            cancelButton="Cancel"
                            confirmButton="Delete"
                            onCancel={closeConfirmDelete}
                            onConfirm={deleteFile}
                          />
                        </ListContent>
                      </List.Item>
                    </List>
                  </GridColumn>

                  {file.filename === schemaFileName && (
                    <GridColumn>
                      <List className="file-details" divided>
                        <Label attached="top">Schema Tags</Label>
                        {schemaInfo.tagset &&
                          schemaInfo.tagset.map((set, i) => (
                            <List.Item>
                              <ListContent>
                                <ListHeader>{set.key}</ListHeader>
                                <ListDescription>{set.value}</ListDescription>
                              </ListContent>
                            </List.Item>
                          ))}
                      </List>
                    </GridColumn>
                  )}
                </GridRow>
              </Grid>
            </Segment>
          </Modal.Description>
        </Modal.Content>
      )}
    </Modal>
  );
};
export default withRouter(FileDetailsModal);
